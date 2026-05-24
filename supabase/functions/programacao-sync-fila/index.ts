import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ErpRow {
  codemp: number;
  numorp: string | number;
  codori?: string | null;
  codpro?: string | null;
  descricao_produto?: string | null;
  codcre: string;
  descre?: string | null;
  codopr?: string | null;
  descricao_operacao?: string | null;
  tipo_recurso?: string | null;
  unidade_negocio?: string | null;
  situacao?: string | null;
  quantidade_prevista?: number | null;
  tempo_previsto_min?: number | null;
  prioridade?: number | null;
  data_geracao_op?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const fastapiBase = Deno.env.get('FASTAPI_BASE_URL');
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (!fastapiBase) {
    return new Response(JSON.stringify({ error: 'FASTAPI_BASE_URL não configurado' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Autenticação: cron-secret OU JWT de usuário
    const cronHeader = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('Authorization');
    let acionadoPor = 'SCHEDULER';

    if (cronSecret && cronHeader === cronSecret) {
      acionadoPor = 'SCHEDULER';
    } else if (authHeader?.startsWith('Bearer ')) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
      if (authErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      acionadoPor = 'USER';
    } else {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Body opcional: { codemp?, situacoes?, unidade_negocio?, codcre?, limit? }
    const body = await req.json().catch(() => ({} as any));
    const qs = new URLSearchParams();
    if (body.codemp != null) qs.set('codemp', String(body.codemp));
    qs.set('situacoes', body.situacoes ?? 'A,L');
    if (body.unidade_negocio) qs.set('unidade_negocio', body.unidade_negocio);
    if (body.codcre) qs.set('codcre', body.codcre);
    qs.set('limit', String(body.limit ?? 5000));

    const url = `${fastapiBase.replace(/\/$/, '')}/api/producao/programacao/fila-erp?${qs.toString()}`;

    // 1) Buscar fila do ERP via FastAPI
    const resp = await fetch(url, {
      headers: { 'ngrok-skip-browser-warning': 'true', 'Accept': 'application/json' },
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`FastAPI ${resp.status}: ${txt.slice(0, 500)}`);
    }
    const json = await resp.json();
    const rows: ErpRow[] = json?.dados ?? json?.data ?? [];

    const lidas = rows.length;

    // 2) Snapshot atual da fila (no escopo do filtro) para reconciliação
    let snapQ = admin.from('bi_ops_fila').select('codemp,numorp,codopr');
    if (body.codemp != null) snapQ = snapQ.eq('codemp', body.codemp);
    if (body.unidade_negocio) snapQ = snapQ.eq('unidade_negocio', body.unidade_negocio);
    if (body.codcre) snapQ = snapQ.eq('codcre', body.codcre);
    const { data: snap, error: snapErr } = await snapQ.limit(20000);
    if (snapErr) throw snapErr;

    const erpKeys = new Set(
      rows.map((r) => `${r.codemp}|${String(r.numorp)}|${r.codopr ?? ''}`),
    );

    const toDelete = (snap ?? []).filter(
      (s: any) => !erpKeys.has(`${s.codemp}|${String(s.numorp)}|${s.codopr ?? ''}`),
    );

    // 3) Upsert em lotes
    let inseridas = 0;
    const payload = rows.map((r) => ({
      codemp: r.codemp,
      numorp: String(r.numorp),
      codori: r.codori ?? null,
      codpro: r.codpro ?? null,
      descricao_produto: r.descricao_produto ?? null,
      codcre: r.codcre,
      descre: r.descre ?? null,
      codopr: r.codopr ?? null,
      descricao_operacao: r.descricao_operacao ?? null,
      tipo_recurso: r.tipo_recurso ?? null,
      unidade_negocio: r.unidade_negocio ?? null,
      situacao: r.situacao ?? 'A',
      quantidade_prevista: Number(r.quantidade_prevista ?? 0),
      tempo_previsto_min: Number(r.tempo_previsto_min ?? 0),
      prioridade: Number(r.prioridade ?? 5),
      data_geracao_op: r.data_geracao_op ?? null,
      etl_updated_at: new Date().toISOString(),
    }));

    for (let i = 0; i < payload.length; i += 500) {
      const chunk = payload.slice(i, i + 500);
      const { error: upErr } = await admin
        .from('bi_ops_fila')
        .upsert(chunk, { onConflict: 'codemp,numorp,codopr' });
      if (upErr) throw upErr;
      inseridas += chunk.length;
    }

    // 4) Remover OPs que sumiram do ERP
    let removidas = 0;
    for (const d of toDelete) {
      const q = admin.from('bi_ops_fila').delete()
        .eq('codemp', d.codemp)
        .eq('numorp', d.numorp);
      if (d.codopr) {
        await q.eq('codopr', d.codopr);
      } else {
        await q.is('codopr', null);
      }
      removidas += 1;
    }

    const duracao = Date.now() - startedAt;

    // 5) Log em etl_execucoes
    await admin.from('etl_execucoes').insert({
      tarefa_codigo: 'SYNC_FILA_OPS_ERP',
      iniciado_em: new Date(startedAt).toISOString(),
      terminado_em: new Date().toISOString(),
      status: 'SUCCESS',
      linhas_lidas: lidas,
      linhas_inseridas: inseridas,
      linhas_atualizadas: 0,
      linhas_rejeitadas: removidas,
      params_executados: body ?? {},
      acionado_por: acionadoPor,
    });

    return new Response(
      JSON.stringify({ lidas, inseridas, removidas, duracao_ms: duracao }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      const admin = createClient(supabaseUrl, serviceKey);
      await admin.from('etl_execucoes').insert({
        tarefa_codigo: 'SYNC_FILA_OPS_ERP',
        iniciado_em: new Date(startedAt).toISOString(),
        terminado_em: new Date().toISOString(),
        status: 'ERROR',
        erro_resumo: msg.slice(0, 1000),
        acionado_por: 'USER',
      });
    } catch (_) {/* ignore */}
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
