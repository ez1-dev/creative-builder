import { supabase } from '@/integrations/supabase/client';
import { getApiUrl } from '@/lib/api';
import type {
  Relatorio,
  RelatorioParametro,
  RelatorioColuna,
  RelatorioLayout,
  RelatorioExecucao,
  PreviewResult,
} from './types';
import { slugifyCodigo } from './schemas';

// ----- CRUD via Lovable Cloud -----
export async function listRelatorios(filters?: { status?: string; modulo?: string }) {
  let q = supabase.from('relatorios').select('*').order('updated_at', { ascending: false });
  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.modulo) q = q.eq('modulo', filters.modulo);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Relatorio[];
}

export async function getRelatorio(id: string) {
  const [{ data: r, error: e1 }, { data: params, error: e2 }, { data: cols, error: e3 }, { data: layout, error: e4 }] =
    await Promise.all([
      supabase.from('relatorios').select('*').eq('id', id).maybeSingle(),
      supabase.from('relatorio_parametros').select('*').eq('relatorio_id', id).order('ordem'),
      supabase.from('relatorio_colunas').select('*').eq('relatorio_id', id).order('ordem'),
      supabase.from('relatorio_layout').select('*').eq('relatorio_id', id).maybeSingle(),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  if (e4) throw e4;
  return {
    relatorio: r as Relatorio | null,
    parametros: (params ?? []) as RelatorioParametro[],
    colunas: (cols ?? []) as unknown as RelatorioColuna[],
    layout: (layout ?? null) as unknown as RelatorioLayout | null,
  };
}


export async function createRelatorio(input: Partial<Relatorio>) {
  const { data: user } = await supabase.auth.getUser();
  const base = slugifyCodigo(input.nome ?? 'relatorio');
  // gera código único: base + sufixo se necessário
  const { data: existentes } = await supabase
    .from('relatorios')
    .select('codigo')
    .ilike('codigo', `${base}%`);
  const existentesSet = new Set((existentes ?? []).map((x: any) => x.codigo));
  let codigo = base;
  let i = 2;
  while (existentesSet.has(codigo)) {
    codigo = `${base}_${i++}`;
  }
  const payload = {
    codigo,
    nome: input.nome ?? 'Novo relatório',
    descricao: input.descricao ?? null,
    modulo: input.modulo ?? null,
    categoria: input.categoria ?? null,
    fonte_dados: input.fonte_dados ?? null,
    sql_query: input.sql_query ?? '',
    status: input.status ?? 'rascunho',
    permite_excel: input.permite_excel ?? true,
    permite_pdf: input.permite_pdf ?? true,
    permite_csv: input.permite_csv ?? true,
    tipo_fonte: input.tipo_fonte ?? 'sql',
    endpoint_url: input.endpoint_url ?? null,
    url_destino: input.url_destino ?? null,
    created_by: user.user?.id ?? null,
  };
  const { data, error } = await supabase.from('relatorios').insert(payload).select('*').single();
  if (error) throw error;
  const saved = data as Relatorio;
  if ((saved.tipo_fonte ?? 'sql') === 'sql' && (saved.sql_query ?? '').trim()) {
    try {
      await createRelatorioFastApi(buildFastApiPayload(saved));
    } catch (e: any) {
      console.warn('[relatorios] falha ao sincronizar criação com ERP:', e?.message ?? e);
    }
  }
  return saved;
}

export async function updateRelatorio(id: string, patch: Partial<Relatorio>) {
  const { data, error } = await supabase
    .from('relatorios')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  const saved = data as Relatorio;
  if ((saved.tipo_fonte ?? 'sql') === 'sql' && (saved.sql_query ?? '').trim()) {
    try {
      await updateRelatorioFastApi(saved.id, buildFastApiPayload(saved));
    } catch (e: any) {
      console.warn('[relatorios] falha ao sincronizar atualização com ERP:', e?.message ?? e);
    }
  }
  return saved;
}

export async function deleteRelatorio(id: string) {
  const { error } = await supabase.from('relatorios').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicarRelatorio(id: string) {
  const { relatorio, parametros, colunas, layout } = await getRelatorio(id);
  if (!relatorio) throw new Error('Relatório não encontrado');
  const novo = await createRelatorio({
    ...relatorio,
    nome: `${relatorio.nome} (cópia)`,
    status: 'rascunho',
  });
  if (parametros.length) {
    await supabase.from('relatorio_parametros').insert(
      parametros.map(({ id: _id, relatorio_id: _r, ...rest }) => ({ ...rest, relatorio_id: novo.id })),
    );
  }
  if (colunas.length) {
    await supabase.from('relatorio_colunas').insert(
      colunas.map(({ id: _id, relatorio_id: _r, ...rest }) => ({ ...rest, relatorio_id: novo.id })),
    );
  }
  if (layout) {
    const { relatorio_id: _r, ...rest } = layout;
    await supabase.from('relatorio_layout').insert([{ ...rest, relatorio_id: novo.id }] as any);
  }
  return novo;
}

// ----- Parâmetros -----
export async function saveParametros(relatorioId: string, params: Omit<RelatorioParametro, 'id' | 'relatorio_id'>[]) {
  await supabase.from('relatorio_parametros').delete().eq('relatorio_id', relatorioId);
  if (params.length === 0) return;
  const { error } = await supabase
    .from('relatorio_parametros')
    .insert(params.map((p) => ({ ...p, relatorio_id: relatorioId })) as any);
  if (error) throw error;
}

// ----- Colunas -----
export async function saveColunas(relatorioId: string, cols: Omit<RelatorioColuna, 'id' | 'relatorio_id'>[]) {
  await supabase.from('relatorio_colunas').delete().eq('relatorio_id', relatorioId);
  if (cols.length === 0) return;
  const { error } = await supabase
    .from('relatorio_colunas')
    .insert(cols.map((c) => ({ ...c, relatorio_id: relatorioId })) as any);
  if (error) throw error;
}

// ----- Layout -----
export async function saveLayout(layout: RelatorioLayout) {
  const { error } = await supabase.from('relatorio_layout').upsert(layout as any);
  if (error) throw error;
}

// ----- Execuções -----
export async function listExecucoes(filters?: { relatorioId?: string; userId?: string; from?: string; to?: string }) {
  let q = supabase
    .from('relatorio_execucoes')
    .select('*, relatorios(nome,codigo)')
    .order('executado_em', { ascending: false })
    .limit(500);
  if (filters?.relatorioId) q = q.eq('relatorio_id', filters.relatorioId);
  if (filters?.userId) q = q.eq('executado_por', filters.userId);
  if (filters?.from) q = q.gte('executado_em', filters.from);
  if (filters?.to) q = q.lte('executado_em', filters.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as (RelatorioExecucao & { relatorios?: { nome: string; codigo: string } })[];
}

export async function listExecucoesPorRelatorio(relatorioId: string, limit = 100) {
  const { data, error } = await supabase
    .from('relatorio_execucoes')
    .select('*')
    .eq('relatorio_id', relatorioId)
    .order('executado_em', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as RelatorioExecucao[];
  // Enriquecer com nome do usuário
  const userIds = Array.from(new Set(rows.map((r) => r.executado_por).filter(Boolean) as string[]));
  let nameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, email, erp_user')
      .in('id', userIds);
    nameById = new Map(
      (profs ?? []).map((p: any) => [p.id, p.display_name || p.erp_user || p.email || p.id]),
    );
  }
  return rows.map((r) => ({
    ...r,
    executado_por_nome: r.executado_por ? nameById.get(r.executado_por) ?? null : null,
  }));
}

export async function gravarExecucao(input: Omit<RelatorioExecucao, 'id' | 'executado_em' | 'executado_por'> & { arquivo?: string | null }) {
  const { data: user } = await supabase.auth.getUser();
  const { arquivo, ...rest } = input;
  const parametros = arquivo ? { ...(input.parametros ?? {}), __arquivo: arquivo } : input.parametros;
  const payload = { ...rest, parametros, executado_por: user.user?.id ?? null };
  const { error } = await supabase.from('relatorio_execucoes').insert(payload as any);
  if (error) throw error;
}

// ----- FastAPI: execução / validação / preview / export -----
async function postFastApi<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem('erp_token');
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`FastAPI ${res.status}: ${txt}`);
  }
  return (await res.json()) as T;
}

async function putFastApi<T>(path: string, body: unknown): Promise<T> {
  const token = localStorage.getItem('erp_token');
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`FastAPI ${res.status}: ${txt}`);
  }
  return (await res.json()) as T;
}

const SQL_VAZIO_MSG = 'Informe o SQL do relatório antes de continuar.';

export async function validarSql(sql_base: string, parametros: Record<string, unknown> = {}) {
  if (!sql_base?.trim()) throw new Error(SQL_VAZIO_MSG);
  return postFastApi<{ valido: boolean; erro?: string; parametros?: string[]; colunas?: { nome: string; tipo: string }[] }>(
    '/api/relatorios/validar-sql',
    { sql_base, parametros },
  );
}

export async function previewSql(sql_base: string, parametros: Record<string, unknown>): Promise<PreviewResult> {
  if (!sql_base?.trim()) throw new Error(SQL_VAZIO_MSG);
  return postFastApi<PreviewResult>('/api/relatorios/preview', { sql_base, parametros, limite: 100 });
}

function buildFastApiPayload(r: Relatorio) {
  return {
    nome: r.nome,
    descricao: r.descricao ?? null,
    modulo: r.modulo ?? null,
    categoria: r.categoria ?? null,
    fonte_dados: r.fonte_dados ?? 'ERP_SENIOR',
    sql_base: r.sql_query ?? '',
    parametros_config: null as unknown,
    colunas_config: null as unknown,
    layout_config: null as unknown,
    status: (r.status ?? 'rascunho').toUpperCase(),
  };
}

export async function createRelatorioFastApi(payload: ReturnType<typeof buildFastApiPayload>) {
  if (!payload.sql_base?.trim()) throw new Error(SQL_VAZIO_MSG);
  return postFastApi('/api/relatorios', payload);
}

export async function updateRelatorioFastApi(id: string, payload: ReturnType<typeof buildFastApiPayload>) {
  if (!payload.sql_base?.trim()) throw new Error(SQL_VAZIO_MSG);
  return putFastApi(`/api/relatorios/${id}`, payload);
}


export async function executarRelatorio(id: string, parametros: Record<string, unknown>): Promise<PreviewResult> {
  return postFastApi<PreviewResult>(`/api/relatorios/${id}/executar`, { parametros });
}

function extractFilename(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return m?.[1] ? decodeURIComponent(m[1]) : fallback;
}

export async function exportarRelatorio(
  id: string,
  formato: 'excel' | 'csv' | 'pdf',
  parametros: Record<string, unknown>,
  fallbackCodigo = 'relatorio',
): Promise<{ blob: Blob; filename: string }> {
  const token = localStorage.getItem('erp_token');
  const res = await fetch(`${getApiUrl()}/api/relatorios/${id}/exportar/${formato}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ parametros }),
  });
  if (!res.ok) throw new Error(`Falha ao exportar (${res.status})`);
  const ext = formato === 'excel' ? 'xlsx' : formato;
  const filename = extractFilename(res.headers.get('content-disposition'), `${fallbackCodigo}.${ext}`);
  return { blob: await res.blob(), filename };
}
