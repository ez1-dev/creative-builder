// Cliente do módulo ATU_CONTABILIDADE (FastAPI BI).
// Endpoints: /api/bi/contabilidade/{status,sync,log,<base>}
import { api } from '@/lib/api';

export const ATU_CONTABILIDADE_ACOES = [
  { ordem: 1,  nome: 'VM_ORC_DRE',                tabela: 'bi_vm_orc_dre' },
  { ordem: 2,  nome: 'VM_LANC_CONTABIL',          tabela: 'bi_vm_lanc_contabil' },
  { ordem: 3,  nome: 'ETL_V_BALANCO_PATRIMONIAL', tabela: 'bi_balanco_patrimonial' },
  { ordem: 99, nome: 'ATU_CONTABILIDADE',         tabela: '—' },
] as const;

export type ContabAcaoNome = (typeof ATU_CONTABILIDADE_ACOES)[number]['nome'];

export interface ContabStatusItem {
  ordem: number;
  nome_acao: string;
  tabela_supabase: string | null;
  total_registros: number | null;
  status: string;
  ultima_execucao: string | null;
  erro?: string | null;
}

export interface ContabLogItem {
  ordem: number | null;
  nome_acao: string;
  tabela_supabase: string | null;
  anomes_ini: string | null;
  anomes_fim: string | null;
  status: string;
  qtd_linhas: number | null;
  erro: string | null;
  acionado_por: string | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
}

export interface ContabDataResponse {
  data: Record<string, unknown>[];
  total?: number;
  columns?: string[];
}

function pickList(resp: any): any[] | null {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray(resp.dados)) return resp.dados;
  if (resp && Array.isArray(resp.data)) return resp.data;
  if (resp && Array.isArray(resp.items)) return resp.items;
  if (resp && Array.isArray(resp.acoes)) return resp.acoes;
  return null;
}

function normalizeStatus(r: any): ContabStatusItem {
  return {
    ordem: Number(r.ordem ?? 0),
    nome_acao: r.nome_acao ?? r.nome ?? r.acao ?? '',
    tabela_supabase: r.tabela_supabase ?? r.tabela ?? null,
    total_registros: r.total_registros ?? r.qtd_linhas ?? null,
    ultima_execucao: r.ultima_execucao ?? r.finalizado_em ?? null,
    status: (r.status ?? '').toString(),
    erro: r.erro ?? null,
  };
}

export async function getContabilidadeStatus(
  anomes_ini: string,
  anomes_fim: string,
): Promise<ContabStatusItem[]> {
  const resp = await api.get<any>('/api/bi/contabilidade/status', { anomes_ini, anomes_fim });
  const list = pickList(resp) ?? [];
  return list.map(normalizeStatus).sort((a, b) => a.ordem - b.ordem);
}

export async function syncContabilidade(
  anomes_ini: string,
  anomes_fim: string,
  acoes?: string[],
): Promise<any> {
  const body: Record<string, unknown> = {
    anomes_ini,
    anomes_fim,
    acionado_por: 'MANUAL',
  };
  if (acoes && acoes.length > 0) body.acoes = acoes;
  return api.post('/api/bi/contabilidade/sync', body);
}

export async function getContabilidadeLog(limit = 100): Promise<ContabLogItem[]> {
  const resp = await api.get<any>('/api/bi/contabilidade/log', { limit });
  const list = pickList(resp) ?? [];
  return list.map((r: any) => ({
    ordem: r.ordem ?? null,
    nome_acao: r.nome_acao ?? r.nome ?? r.acao ?? '',
    tabela_supabase: r.tabela_supabase ?? r.tabela ?? null,
    anomes_ini: r.anomes_ini ?? null,
    anomes_fim: r.anomes_fim ?? null,
    status: r.status ?? '',
    qtd_linhas: r.qtd_linhas ?? r.total_registros ?? null,
    erro: r.erro ?? null,
    acionado_por: r.acionado_por ?? null,
    iniciado_em: r.iniciado_em ?? null,
    finalizado_em: r.finalizado_em ?? null,
  }));
}

export async function getContabilidadeData(
  nomeBase: string,
  anomes_ini: string,
  anomes_fim: string,
  limit = 100,
  offset = 0,
): Promise<ContabDataResponse> {
  const resp = await api.get<any>(`/api/bi/contabilidade/${encodeURIComponent(nomeBase)}`, {
    anomes_ini,
    anomes_fim,
    limit,
    offset,
  });
  const list = pickList(resp);
  if (list) {
    return { data: list, total: resp?.total, columns: resp?.columns };
  }
  return { data: [] };
}
