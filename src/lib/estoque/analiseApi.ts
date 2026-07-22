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

function normalizeItem(raw: any): EstoqueAnaliseItem {
  const codpro = raw.codpro ?? raw.codigo ?? null;
  const despro = raw.despro ?? raw.descricao ?? null;
  const coddep = raw.coddep ?? raw.deposito ?? null;
  const desdep = raw.desdep ?? raw.deposito ?? null;
  const codder = raw.codder ?? raw.derivacao ?? null;
  const desder = raw.desder ?? raw.derivacao ?? null;
  const consumo_quantidade = raw.consumo_quantidade ?? raw.consumo_qtd ?? null;
  return {
    ...raw,
    codpro,
    despro,
    coddep,
    desdep,
    codder,
    desder,
    codfam: raw.codfam ?? raw.familia ?? null,
    consumo_quantidade,
  };
}

function buildResumoFallback(items: EstoqueAnaliseItem[], base: EstoqueAnaliseResumo | null): EstoqueAnaliseResumo {
  // Fallback de exibição enquanto o backend não envia `resumo`.
  const acc: any = {
    valor_total_estoque: 0,
    consumo_periodo_valor: 0,
    itens_curva_a: 0,
    itens_curva_b: 0,
    itens_curva_c: 0,
    itens_sem_consumo: 0,
    valor_itens_sem_consumo: 0,
    universo: items.length,
    capital_parado_12m: 0,
    capital_parado_24m: 0,
    itens_sem_saida: 0,
    valor_itens_sem_saida: 0,
    itens_baixo_giro_com_compra: 0,
    aging: {
      ate_6m: 0, de_6_12m: 0, de_12_24m: 0, acima_24m: 0, sem_saida: 0,
      valor_ate_6m: 0, valor_de_6_12m: 0, valor_de_12_24m: 0, valor_acima_24m: 0, valor_sem_saida: 0,
    },
  };
  for (const it of items) {
    const val = Number(it.valor_estoque ?? 0);
    acc.valor_total_estoque += val;
    acc.consumo_periodo_valor += Number(it.consumo_valor ?? 0);
    const cls = it.curva_abc;
    if (cls === 'A') acc.itens_curva_a += 1;
    else if (cls === 'B') acc.itens_curva_b += 1;
    else if (cls === 'C') acc.itens_curva_c += 1;
    if (isSemConsumo(it)) { acc.itens_sem_consumo += 1; acc.valor_itens_sem_consumo += val; }
    const f = faixaAging(it);
    acc.aging[f] += 1;
    acc.aging[`valor_${f}`] += val;
    if (f === 'sem_saida') { acc.itens_sem_saida += 1; acc.valor_itens_sem_saida += val; }
    if (f === 'de_12_24m' || f === 'acima_24m' || f === 'sem_saida') acc.capital_parado_12m += val;
    if (f === 'acima_24m' || f === 'sem_saida') acc.capital_parado_24m += val;
    if ((f !== 'ate_6m' || isSemConsumo(it)) && Number(it.a_receber ?? 0) > 0) acc.itens_baixo_giro_com_compra += 1;
  }
  return { ...acc, ...(base ?? {}) };
}

export async function getEstoqueAnalise(params: EstoqueAnaliseParams, signal?: AbortSignal): Promise<EstoqueAnaliseResponse> {
  const clean: Record<string, any> = { ...params };
  if (clean.codfil === 'all' || clean.codfil === '') delete clean.codfil;
  const raw = await api.get<EstoqueAnaliseResponse>('/api/estoque/analise', clean);
  const dados = (raw?.dados ?? []).map(normalizeItem);
  const resumo = buildResumoFallback(dados, raw?.resumo ?? null);
  return { ...raw, dados, resumo };
}

export function isSemConsumo(item: EstoqueAnaliseItem): boolean {
  const cq = item.consumo_quantidade ?? (item as any).consumo_qtd;
  const cv = item.consumo_valor;
  return item.curva_abc == null && (cv == null || Number(cv) === 0)
    && (cq == null || Number(cq) === 0);
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
