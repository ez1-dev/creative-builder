import { api, getApiUrl } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

export interface TabelaCandidata {
  schema_name: string;
  table_name: string;
}
export interface ColunaCandidata {
  schema_name: string;
  table_name: string;
  column_name: string;
}
export interface SyncDeparaResponse {
  success: boolean;
  origem: string;
  destino: string;
  total_registros: number;
  message: string;
}
export interface ValidacaoSupabase {
  totalAtivos: number;
  contasDistintas: number;
  centrosDistintos: number;
  porMascara: Array<{ cd_mascara_dre: string; quantidade: number }>;
  ultimos: Array<{
    cd_conta_contabil: string;
    cd_centro_custos: string;
    cd_mascara_dre: string;
    descricao: string | null;
    ativo: boolean;
    updated_at: string;
  }>;
}

function authHeaders(): Record<string, string> {
  const token = api.getToken();
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function getJson(path: string): Promise<any> {
  const resp = await fetch(`${getApiUrl()}${path}`, { headers: authHeaders() });
  const text = await resp.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }
  if (!resp.ok) {
    const detail = json?.detail || json?.message || text || `HTTP ${resp.status}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return json;
}

async function postJson(path: string, body: any = {}): Promise<any> {
  const resp = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body ?? {}),
  });
  const text = await resp.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }
  if (!resp.ok) {
    const detail = json?.detail || json?.message || text || `HTTP ${resp.status}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return json;
}

export async function buscarTabelasCandidatasErp(): Promise<TabelaCandidata[]> {
  const data = await getJson('/api/admin/erp/tabelas-candidatas-dre');
  const lista = Array.isArray(data?.dados)
    ? data.dados
    : Array.isArray(data?.tabelas) ? data.tabelas
    : Array.isArray(data) ? data
    : [];
  return lista.map((r: any) => ({
    schema_name: String(r?.schema_name ?? r?.schema ?? ''),
    table_name: String(r?.table_name ?? r?.tabela ?? ''),
  }));
}

export async function buscarColunasCandidatasErp(): Promise<ColunaCandidata[]> {
  const data = await getJson('/api/admin/erp/colunas-candidatas-dre');
  const lista = Array.isArray(data?.dados)
    ? data.dados
    : Array.isArray(data?.colunas) ? data.colunas
    : Array.isArray(data) ? data
    : [];
  return lista.map((r: any) => ({
    schema_name: String(r?.schema_name ?? r?.schema ?? ''),
    table_name: String(r?.table_name ?? r?.tabela ?? ''),
    column_name: String(r?.column_name ?? r?.coluna ?? ''),
  }));
}

export async function sincronizarDeparaDreErp(): Promise<SyncDeparaResponse> {
  const data = await postJson('/api/bi/contabilidade/sync-depara-dre', {});
  return {
    success: Boolean(data?.success ?? true),
    origem: String(data?.origem ?? 'ERP Senior SQL Server'),
    destino: String(data?.destino ?? 'Supabase.bi_dre_depara_conta_ccu'),
    total_registros: Number(data?.total_registros ?? 0),
    message: String(data?.message ?? 'Sincronização concluída.'),
  };
}

export async function validarDeparaSupabase(): Promise<ValidacaoSupabase> {
  const { data, error } = await supabase
    .from('bi_dre_depara_conta_ccu')
    .select('cd_conta_contabil, cd_centro_custos, cd_mascara_dre, descricao, ativo, updated_at')
    .eq('ativo', true);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const contas = new Set<string>();
  const centros = new Set<string>();
  const mascaras = new Map<string, number>();
  for (const r of rows) {
    if (r.cd_conta_contabil) contas.add(r.cd_conta_contabil);
    if (r.cd_centro_custos) centros.add(r.cd_centro_custos);
    const m = r.cd_mascara_dre ?? '—';
    mascaras.set(m, (mascaras.get(m) ?? 0) + 1);
  }
  const porMascara = Array.from(mascaras.entries())
    .map(([cd_mascara_dre, quantidade]) => ({ cd_mascara_dre, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
  const ultimos = [...rows]
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))
    .slice(0, 20)
    .map((r) => ({
      cd_conta_contabil: r.cd_conta_contabil ?? '',
      cd_centro_custos: r.cd_centro_custos ?? '',
      cd_mascara_dre: r.cd_mascara_dre ?? '',
      descricao: r.descricao ?? null,
      ativo: Boolean(r.ativo),
      updated_at: r.updated_at ?? '',
    }));
  return {
    totalAtivos: rows.length,
    contasDistintas: contas.size,
    centrosDistintos: centros.size,
    porMascara,
    ultimos,
  };
}
