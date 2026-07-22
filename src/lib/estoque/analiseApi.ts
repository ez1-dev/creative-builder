import { api } from '@/lib/api';

export type CriterioAbc = 'CONSUMO' | 'VALOR_ESTOQUE';
export type CurvaClasse = 'A' | 'B' | 'C';

export interface EstoqueAnaliseItem {
  codpro?: string | null;
  despro?: string | null;
  codder?: string | null;
  desder?: string | null;
  coddep?: string | null;
  desdep?: string | null;

  saldo?: number | null;
  custo_medio?: number | null;
  valor_estoque?: number | null;

  consumo_quantidade?: number | null;
  consumo_valor?: number | null;

  ultima_saida?: string | null;
  dias_sem_saida?: number | null;

  giro?: number | null;
  cobertura_meses?: number | null;

  curva_abc?: CurvaClasse | null;
  abc_pct_acumulado?: number | null;

  reservado?: number | null;
  ops_reservando?: number | null;
  disponivel?: number | null;
  a_receber?: number | null;
  proxima_entrega?: string | null;
  projetado?: number | null;

  faixa_aging?: string | null;
  [k: string]: any;
}

export interface EstoqueAnaliseResumo {
  valor_total_estoque?: number | null;
  consumo_periodo_valor?: number | null;
  itens_curva_a?: number | null;
  itens_curva_b?: number | null;
  itens_curva_c?: number | null;
  itens_sem_consumo?: number | null;
  valor_itens_sem_consumo?: number | null;
  universo?: number | null;

  capital_parado_12m?: number | null;
  capital_parado_24m?: number | null;
  itens_sem_saida?: number | null;
  valor_itens_sem_saida?: number | null;
  itens_baixo_giro_com_compra?: number | null;

  aging?: {
    ate_6m?: number | null;
    de_6_12m?: number | null;
    de_12_24m?: number | null;
    acima_24m?: number | null;
    sem_saida?: number | null;
    valor_ate_6m?: number | null;
    valor_de_6_12m?: number | null;
    valor_de_12_24m?: number | null;
    valor_acima_24m?: number | null;
    valor_sem_saida?: number | null;
  } | null;

  [k: string]: any;
}

export interface EstoqueAnaliseResponse {
  dados: EstoqueAnaliseItem[];
  resumo?: EstoqueAnaliseResumo | null;
  observacoes?: string[] | string | null;
  meta?: Record<string, any> | null;
  total_registros?: number;
  pagina?: number;
  total_paginas?: number;
  [k: string]: any;
}

export interface EstoqueAnaliseParams {
  codemp?: number | string;
  codfil?: number | string | 'all';
  meses_consumo: number;
  criterio_abc: CriterioAbc;
  corte_a: number;
  corte_b: number;
  codpro?: string;
  coddep?: string;
  codfam?: string;
  situacao?: string;
}

export async function getEstoqueAnalise(params: EstoqueAnaliseParams, signal?: AbortSignal): Promise<EstoqueAnaliseResponse> {
  const clean: Record<string, any> = { ...params };
  if (clean.codfil === 'all' || clean.codfil === '') delete clean.codfil;
  return api.get<EstoqueAnaliseResponse>('/api/estoque/analise', clean);
}

export function isSemConsumo(item: EstoqueAnaliseItem): boolean {
  return item.curva_abc == null && (item.consumo_valor == null || Number(item.consumo_valor) === 0)
    && (item.consumo_quantidade == null || Number(item.consumo_quantidade) === 0);
}

export function classificarBadge(item: EstoqueAnaliseItem): 'A' | 'B' | 'C' | 'SEM_CONSUMO' {
  if (item.curva_abc === 'A' || item.curva_abc === 'B' || item.curva_abc === 'C') return item.curva_abc;
  return 'SEM_CONSUMO';
}

export const AGING_FAIXAS = [
  { key: 'ate_6m', label: '0 a 6 meses', min: 0, max: 180 },
  { key: 'de_6_12m', label: '6 a 12 meses', min: 180, max: 365 },
  { key: 'de_12_24m', label: '12 a 24 meses', min: 365, max: 730 },
  { key: 'acima_24m', label: '24 meses ou mais', min: 730, max: Infinity },
  { key: 'sem_saida', label: 'Sem saída registrada', min: null as any, max: null as any },
] as const;

export type AgingKey = typeof AGING_FAIXAS[number]['key'];

export function faixaAging(item: EstoqueAnaliseItem): AgingKey {
  if (item.faixa_aging) {
    const norm = String(item.faixa_aging).toLowerCase();
    if (norm.includes('sem')) return 'sem_saida';
    if (norm.includes('24')) return 'acima_24m';
    if (norm.includes('12')) return 'de_12_24m';
    if (norm.includes('6')) return 'de_6_12m';
    return 'ate_6m';
  }
  const dias = item.dias_sem_saida;
  if (dias == null || !item.ultima_saida) return 'sem_saida';
  if (dias >= 730) return 'acima_24m';
  if (dias >= 365) return 'de_12_24m';
  if (dias >= 180) return 'de_6_12m';
  return 'ate_6m';
}

export function formatCobertura(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'Sem consumo';
  if (v >= 24) return '24+ meses';
  return `${v.toFixed(1).replace('.', ',')} meses`;
}
