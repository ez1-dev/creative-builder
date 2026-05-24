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

function jsonOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function validateBaseUrl(
  raw: string | undefined,
  cronSecret: string | undefined,
): { ok: true; url: string } | { ok: false; code: string; message: string } {
  if (!raw || !raw.trim()) {
    return { ok: false, code: 'MISSING_BASE_URL', message: 'FASTAPI_BASE_URL não configurado nos secrets do Cloud.' };
  }
  const trimmed = raw.trim();

  if (cronSecret && trimmed === cronSecret.trim()) {
    return {
      ok: false,
      code: 'BASE_URL_EQUALS_CRON_SECRET',
      message: 'FASTAPI_BASE_URL está com o mesmo valor de CRON_SECRET. Eles foram trocados — corrija o secret FASTAPI_BASE_URL para a URL pública da FastAPI (ex.: https://xxxx.ngrok-free.app).',
    };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      ok: false,
      code: 'INVALID_BASE_URL',
      message: `FASTAPI_BASE_URL inválido: "${trimmed}". Deve começar com http:// ou https:// (ex.: https://xxxx.ngrok-free.app).`,
    };
  }

  if (trimmed.endsWith('/')) {
    return {
      ok: false,
      code: 'INVALID_BASE_URL_TRAILING_SLASH',
      message: `FASTAPI_BASE_URL não pode terminar com "/". Valor atual: "${trimmed}".`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, code: 'INVALID_BASE_URL', message: `FASTAPI_BASE_URL inválido: "${trimmed}". Deve ser uma URL absoluta (ex.: https://api.exemplo.com).` };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, code: 'INVALID_BASE_URL', message: `FASTAPI_BASE_URL deve usar http(s). Recebido: ${parsed.protocol}` };
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return { ok: false, code: 'LOCALHOST_NOT_ALLOWED', message: `FASTAPI_BASE_URL aponta para "${host}" — a Edge Function roda na nuvem e não enxerga sua máquina. Use uma URL pública (ngrok, domínio próprio etc.).` };
  }
  return { ok: true, url: trimmed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const fastapiRaw = Deno.env.get('FASTAPI_BASE_URL');
  const cronSecret = Deno.env.get('CRON_SECRET');

  let acionadoPor: 'USER' | 'SCHEDULER' = 'USER';
  let admin: ReturnType<typeof createClient> | null = null;

  try {
    // Autenticação: cron-secret OU JWT de usuário
    const cronHeader = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('Authorization');

    if (cronSecret && cronHeader && cronHeader === cronSecret) {
      acionadoPor = 'SCHEDULER';
    } else if (authHeader?.startsWith('Bearer ')) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
      if (authErr || !claims?.claims) {
        return jsonOk({ ok: false, code: 'UNAUTHORIZED', message: 'Token de autenticação inválido.' }, 401);
      }
    } else {
      return jsonOk({ ok: false, code: 'UNAUTHORIZED', message: 'Requer login ou x-cron-secret.' }, 401);
    }

    admin = createClient(supabaseUrl, serviceKey);

    // Validar FASTAPI_BASE_URL
    const baseCheck = validateBaseUrl(fastapiRaw, cronSecret);
    if (!baseCheck.ok) {
      await admin.from('etl_execucoes').insert({
        tarefa_codigo: 'SYNC_FILA_OPS_ERP',
        iniciado_em: new Date(startedAt).toISOString(),
        terminado_em: new Date().toISOString(),
        status: 'ERROR',
        erro_resumo: `[${baseCheck.code}] ${baseCheck.message}`,
        acionado_por: acionadoPor,
      });
      return jsonOk({ ok: false, code: baseCheck.code, message: baseCheck.message });
    }
    const fastapiBase = baseCheck.url;

    // Body opcional. Sincronização padrão = snapshot completo de A,L (sem datas).
    const body = await req.json().catch(() => ({} as any));
    const qs = new URLSearchParams();
    qs.set('codemp', String(body.codemp ?? 1));
    qs.set('situacoes', body.situacoes ?? 'A,L');
    if (body.unidade_negocio) qs.set('unidade_negocio', body.unidade_negocio);
    if (body.codcre) qs.set('codcre', body.codcre);
    qs.set('limite', String(body.limite ?? body.limit ?? 5000));

    const url = `${fastapiBase}/api/producao/programacao/fila-erp?${qs.toString()}`;

    // 1) Buscar fila do ERP via FastAPI
    const headers: Record<string, string> = {
      'ngrok-skip-browser-warning': 'true',
      'Accept': 'application/json',
    };
    if (cronSecret) headers['x-cron-secret'] = cronSecret;

    let resp: Response;
    try {
      resp = await fetch(url, { headers });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from('etl_execucoes').insert({
        tarefa_codigo: 'SYNC_FILA_OPS_ERP',
        iniciado_em: new Date(startedAt).toISOString(),
        terminado_em: new Date().toISOString(),
        status: 'ERROR',
        erro_resumo: `[FETCH_FAILED] ${msg}`,
        params_executados: { ...(body ?? {}), url_chamada: url },
        acionado_por: acionadoPor,
      });
      return jsonOk({
        ok: false,
        code: 'FETCH_FAILED',
        message: `Não foi possível conectar à FastAPI em ${fastapiBase}.`,
        detalhe: msg,
        url_chamada: url,
      });
    }

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      const detalhe = txt.slice(0, 800);
      await admin.from('etl_execucoes').insert({
        tarefa_codigo: 'SYNC_FILA_OPS_ERP',
        iniciado_em: new Date(startedAt).toISOString(),
        terminado_em: new Date().toISOString(),
        status: 'ERROR',
        erro_resumo: `[FASTAPI_${resp.status}] ${detalhe.slice(0, 500)}`,
        params_executados: { ...(body ?? {}), url_chamada: url },
        acionado_por: acionadoPor,
      });
      return jsonOk({
        ok: false,
        code: `FASTAPI_${resp.status}`,
        message: `FastAPI respondeu ${resp.status} ao chamar ${url}.`,
        detalhe,
        url_chamada: url,
      });
    }

    const json = await resp.json().catch(() => ({}));
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
      if (d.codopr) await q.eq('codopr', d.codopr);
      else await q.is('codopr', null);
      removidas += 1;
    }

    const duracao_ms = Date.now() - startedAt;

    await admin.from('etl_execucoes').insert({
      tarefa_codigo: 'SYNC_FILA_OPS_ERP',
      iniciado_em: new Date(startedAt).toISOString(),
      terminado_em: new Date().toISOString(),
      status: 'SUCCESS',
      linhas_lidas: lidas,
      linhas_inseridas: inseridas,
      linhas_atualizadas: 0,
      linhas_rejeitadas: removidas,
      params_executados: { ...(body ?? {}), url_chamada: url },
      acionado_por: acionadoPor,
    });

    return jsonOk({ ok: true, lidas, inseridas, removidas, duracao_ms, url_chamada: url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      const a = admin ?? createClient(supabaseUrl, serviceKey);
      await a.from('etl_execucoes').insert({
        tarefa_codigo: 'SYNC_FILA_OPS_ERP',
        iniciado_em: new Date(startedAt).toISOString(),
        terminado_em: new Date().toISOString(),
        status: 'ERROR',
        erro_resumo: msg.slice(0, 1000),
        acionado_por: acionadoPor,
      });
    } catch (_) {/* ignore */}
    return jsonOk({ ok: false, code: 'UNEXPECTED', message: msg });
  }
});
