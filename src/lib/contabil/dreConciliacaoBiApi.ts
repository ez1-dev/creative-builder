// Conciliação DRE (aplicação) x BI. Backend faz a comparação — frontend só renderiza.

import { contabilApi } from './contabilApi';

export type ConciliacaoStatus =
  | 'CONCILIADO'
  | 'ARREDONDAMENTO'
  | 'DIVERGENTE'
  | 'SEM_CORRESPONDENCIA'
  | 'MES_INCOMPLETO';

export interface ConciliacaoBiLinha {
  linha: string;
  codigo_linha?: string | null;
  anomes: string;             // AAAAMM
  valor_app: number | null;
  valor_bi: number | null;
  diferenca: number | null;
  diferenca_pct: number | null;
  status: ConciliacaoStatus;
}

export interface ConciliacaoBiResponse {
  linhas: ConciliacaoBiLinha[];
  tolerancia: number;
  gerado_em: string | null;
}

export interface ConciliacaoBiParams {
  ano: number;
  mes_ini: string;
  mes_fim: string;
  modelo_id?: string | null;
  unidade?: string;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function normalizarStatus(s: unknown): ConciliacaoStatus {
  const k = String(s ?? '').trim().toUpperCase();
  if (['CONCILIADO', 'ARREDONDAMENTO', 'DIVERGENTE', 'SEM_CORRESPONDENCIA', 'MES_INCOMPLETO'].includes(k)) {
    return k as ConciliacaoStatus;
  }
  return 'DIVERGENTE';
}

export async function fetchConciliacaoBi(params: ConciliacaoBiParams): Promise<ConciliacaoBiResponse> {
  const query: Record<string, any> = {
    anomes_ini: `${params.ano}${params.mes_ini}`,
    anomes_fim: `${params.ano}${params.mes_fim}`,
  };
  if (params.modelo_id) query.modelo_id = params.modelo_id;
  if (params.unidade && params.unidade !== 'TODOS') query.unidade = params.unidade;

  const data = await contabilApi.get<any>('/api/contabil/dre/conciliacao-bi', query);
  const raw = Array.isArray(data?.linhas) ? data.linhas : Array.isArray(data) ? data : [];
  return {
    linhas: raw.map((r: any) => ({
      linha: String(r?.linha ?? r?.descricao ?? '—'),
      codigo_linha: r?.codigo_linha ?? null,
      anomes: String(r?.anomes ?? r?.mes ?? ''),
      valor_app: toNum(r?.valor_app ?? r?.valor_aplicacao),
      valor_bi: toNum(r?.valor_bi),
      diferenca: toNum(r?.diferenca),
      diferenca_pct: toNum(r?.diferenca_pct ?? r?.pct),
      status: normalizarStatus(r?.status),
    })),
    tolerancia: toNum(data?.tolerancia) ?? 1,
    gerado_em: data?.gerado_em ?? null,
  };
}
