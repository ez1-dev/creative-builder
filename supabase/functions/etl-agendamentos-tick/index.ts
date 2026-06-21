// Edge function disparada por pg_cron a cada minuto.
// Lê agendamentos vencidos, chama a API FastAPI para executar a tarefa,
// e reagenda a próxima execução.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ETL_USER = Deno.env.get('ETL_AGENDADOR_USUARIO') ?? '';
const ETL_PASS = Deno.env.get('ETL_AGENDADOR_SENHA') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function anomesAtual(d: Date) {
  return d.getUTCFullYear() * 100 + (d.getUTCMonth() + 1);
}
function addMonths(d: Date, n: number) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  return x;
}
function calcularJanela(tipo: string, n: number): { anomes_ini: number; anomes_fim: number } {
  const hoje = new Date();
  if (tipo === 'mes_anterior') {
    const prev = addMonths(hoje, -1);
    const v = anomesAtual(prev);
    return { anomes_ini: v, anomes_fim: v };
  }
  if (tipo === 'ultimos_n_meses') {
    const ini = addMonths(hoje, -(Math.max(n, 1) - 1));
    return { anomes_ini: anomesAtual(ini), anomes_fim: anomesAtual(hoje) };
  }
  const v = anomesAtual(hoje);
  return { anomes_ini: v, anomes_fim: v };
}

async function carregarErpBaseUrl(): Promise<string | null> {
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'erp_api_url')
    .maybeSingle();
  let url = (data?.value ?? '').trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
}

let cachedToken: { token: string; expiresAt: number } | null = null;
async function obterTokenErp(baseUrl: string): Promise<string | null> {
  if (!ETL_USER || !ETL_PASS) return null;
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token;
  const params = new URLSearchParams({ usuario: ETL_USER, senha: ETL_PASS });
  const r = await fetch(`${baseUrl}/login?${params}`, {
    method: 'POST',
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });
  if (!r.ok) {
    console.error('Falha login ERP', r.status, await r.text().catch(() => ''));
    return null;
  }
  const j = await r.json();
  cachedToken = { token: j.access_token, expiresAt: now + 30 * 60_000 };
  return cachedToken.token;
}

async function executarTarefa(
  baseUrl: string,
  token: string,
  nomeTarefa: string,
  payload: Record<string, unknown>,
) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const r = await fetch(`${baseUrl}/api/etl/tarefas/${encodeURIComponent(nomeTarefa)}/executar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const txt = await r.text();
    let body: any = null;
    try { body = JSON.parse(txt); } catch { body = { detail: txt }; }
    return { ok: r.ok, status: r.status, body };
  } catch (e: any) {
    return { ok: false, status: 0, body: { detail: e?.message ?? String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Lock atômico: marca como "rodando" todos vencidos, retornando snapshot
    const { data: vencidos, error: lockErr } = await admin
      .from('etl_agendamentos')
      .select('*')
      .eq('ativo', true)
      .lte('proxima_execucao_em', new Date().toISOString());

    if (lockErr) throw lockErr;
    if (!vencidos || vencidos.length === 0) {
      return new Response(JSON.stringify({ processados: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = await carregarErpBaseUrl();
    if (!baseUrl) {
      return new Response(JSON.stringify({ erro: 'erp_api_url não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = await obterTokenErp(baseUrl);
    if (!token) {
      return new Response(JSON.stringify({ erro: 'Credenciais do agendador ETL ausentes ou inválidas' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resultados: any[] = [];
    for (const ag of vencidos) {
      const janela = calcularJanela(ag.janela_tipo, ag.janela_n_meses ?? 1);
      const payload = {
        anomes_ini: janela.anomes_ini,
        anomes_fim: janela.anomes_fim,
        acionado_por: 'agendador',
        ...(ag.parametros_extras ?? {}),
      };
      const resp = await executarTarefa(baseUrl, token, ag.nome_tarefa, payload);

      const mensagem = resp.ok
        ? `OK (exec ${resp.body?.execucao_id ?? '—'})`
        : `ERRO ${resp.status}: ${resp.body?.detail ?? 'falha'}`;

      // Calcula próxima e atualiza
      const { data: prox } = await admin.rpc('etl_agendamento_calcular_proxima', {
        _frequencia: ag.frequencia,
        _intervalo_minutos: ag.intervalo_minutos,
        _hora: ag.hora,
        _minuto: ag.minuto,
        _dias_semana: ag.dias_semana ?? [],
        _ref: new Date().toISOString(),
      });

      await admin
        .from('etl_agendamentos')
        .update({
          ultima_execucao_em: new Date().toISOString(),
          ultimo_status: resp.ok ? 'SUCESSO' : 'ERRO',
          ultima_mensagem: mensagem,
          proxima_execucao_em: prox,
        })
        .eq('id', ag.id);

      resultados.push({ id: ag.id, tarefa: ag.nome_tarefa, ok: resp.ok, mensagem });
    }

    return new Response(JSON.stringify({ processados: resultados.length, resultados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('tick error', e);
    return new Response(JSON.stringify({ erro: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
