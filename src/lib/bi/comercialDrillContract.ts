/**
 * Contrato global de drill do BI Comercial.
 *
 * - `pickComercialLabel`: ordem padrão de fallback para exibir o NOME de qualquer linha.
 * - `extractDrillCtx`: monta o `DrillContexto` correto a partir de uma linha (priorizando `filtros_drill`).
 * - `KPI_DRILL_MAP`: mapeamento KPI -> DrillType oficial.
 * - `dimToDrillType`: dimensão técnica -> DrillType.
 */
import type { DrillContexto, DrillType } from './comercialDrillApi';

/** Lista única de candidatos a "nome amigável". A ordem importa. */
export const COMERCIAL_LABEL_FALLBACK_KEYS: string[] = [
  'display_label', 'label',
  'cliente_label', 'revenda_label', 'produto_label',
  'estado_label', 'obra_label', 'nf_label',
  'nome', 'name', 'descricao',
  'nm_revenda', 'ds_revenda', 'revenda', 'nm_fantasia',
  'nm_cliente', 'ds_cliente',
  'nm_estado', 'estado', 'sg_uf', 'uf',
  'ds_produto', 'descricao_produto', 'produto',
  'projeto', 'ds_abr_prj', 'nm_projeto',
  'cd_rev_pedido', 'cd_cliente', 'cd_produto', 'cd_estado', 'cd_nf', 'cd_prj', 'cd_derivacao',
];

/** Valores sentinela inválidos para um filtro técnico de drill. */
const INVALID_FILTER_VALUES = new Set<string>([
  'undefined', 'null', '(sem nome)', 'sem nome',
  'todos', 'todas', 'consolidado',
]);

/**
 * Normaliza um valor de filtro de drill. Devolve null quando o valor é
 * `undefined`, `null`, vazio, ou um sentinela visual (ex.: "(sem nome)",
 * "TODOS", "CONSOLIDADO"). Caso contrário, devolve a string trim().
 */
export function cleanDrillValue(value: any): string | null {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  if (!v) return null;
  if (INVALID_FILTER_VALUES.has(v.toLowerCase())) return null;
  return v;
}

/** Lista das chaves técnicas conhecidas de um DrillContexto. */
export const ALL_DRILL_CTX_KEYS: (keyof DrillContexto)[] = [
  'anomes_emissao', 'cd_estado', 'cd_cliente', 'cd_prj', 'cd_rev_pedido',
  'cd_origem', 'cd_tp_movimento', 'cd_tns', 'cd_nf', 'cd_produto',
  'cd_derivacao', 'categoria_custom',
];

/**
 * Aplica `cleanDrillValue` a todas as chaves conhecidas de um DrillContexto.
 * Chaves cujo valor virar null são incluídas como null no objeto resultante.
 * Use `compactDrillContext` para remover os nulls antes de enviar à API.
 */
export function cleanDrillContext(contexto: Partial<DrillContexto> | null | undefined): Record<keyof DrillContexto, string | null> {
  const out = {} as Record<keyof DrillContexto, string | null>;
  ALL_DRILL_CTX_KEYS.forEach((k) => {
    out[k] = cleanDrillValue((contexto as any)?.[k]);
  });
  return out;
}

/**
 * Versão "compacta": só inclui chaves cujo valor sobreviveu à limpeza.
 * Use ao montar payloads ou contexto para o stack de drill.
 */
export function compactDrillContext(contexto: Partial<DrillContexto> | null | undefined): DrillContexto {
  const out: DrillContexto = {};
  ALL_DRILL_CTX_KEYS.forEach((k) => {
    const v = cleanDrillValue((contexto as any)?.[k]);
    if (v != null) (out as any)[k] = v;
  });
  return out;
}

const isBadLabel = (s: any): boolean => {
  if (s == null) return true;
  const t = String(s).trim().toLowerCase();
  return t === '' || t === '-' || t === 'null' || t === 'undefined' || t === '(sem nome)';
};

/**
 * Retorna o melhor label para uma linha do BI Comercial. Usa fallback global,
 * com possibilidade de prepend de chaves específicas do contexto (ex.: dim atual).
 */
export function pickComercialLabel(row: Record<string, any> | null | undefined, extraKeys: string[] = [], fallback = '(sem nome)'): string {
  if (!row) return fallback;
  const keys = [...extraKeys, ...COMERCIAL_LABEL_FALLBACK_KEYS];
  for (const k of keys) {
    const v = row[k];
    if (!isBadLabel(v)) return String(v).trim();
  }
  return fallback;
}

/** Coluna técnica esperada para cada DrillType conhecido. */
export const DRILL_KEY_FROM_TYPE: Partial<Record<DrillType, keyof DrillContexto>> = {
  MENSAL: 'anomes_emissao',
  ESTADO: 'cd_estado',
  CLIENTE: 'cd_cliente',
  REVENDA: 'cd_rev_pedido',
  PRODUTO: 'cd_produto',
  NOTA_FISCAL: 'cd_nf',
  // OBRAS (alias): cd_prj
};

/** Candidatos de coluna técnica por DrillType (na ordem em que devem ser tentados). */
const TECH_KEYS_BY_TYPE: Partial<Record<DrillType, string[]>> = {
  MENSAL:      ['anomes_emissao'],
  ESTADO:      ['cd_estado', 'sg_uf', 'uf'],
  CLIENTE:     ['cd_cliente'],
  REVENDA:     ['cd_rev_pedido', 'cd_revenda'],
  PRODUTO:     ['cd_produto'],
  NOTA_FISCAL: ['cd_nf', 'numero_nf', 'nr_nf'],
};

/**
 * Extrai o contexto adicional a partir de uma linha clicada.
 *
 * Regra (em ordem):
 * 1. Se `row.filtros_drill` existir, usa-o (limpando vazios e sentinelas).
 * 2. Senão monta `{ [coluna técnica do drillType]: valor }` usando candidatos
 *    técnicos. Como último recurso usa `row.label` (mas nunca um sentinela).
 */
export function extractDrillCtx(row: Record<string, any> | null | undefined, drillType: DrillType): DrillContexto {
  if (!row) return {};
  if (row.filtros_drill && typeof row.filtros_drill === 'object') {
    return compactDrillContext(row.filtros_drill as DrillContexto);
  }
  const techKeys = TECH_KEYS_BY_TYPE[drillType] ?? [];
  for (const k of techKeys) {
    const v = cleanDrillValue(row[k]);
    if (v) {
      const targetKey = DRILL_KEY_FROM_TYPE[drillType];
      if (!targetKey) return {};
      return { [targetKey]: v } as DrillContexto;
    }
  }
  // último recurso: label (texto visual). Só usa se não for sentinela.
  const lbl = cleanDrillValue(row.label);
  const targetKey = DRILL_KEY_FROM_TYPE[drillType];
  if (targetKey && lbl) {
    return { [targetKey]: lbl } as DrillContexto;
  }
  return {};
}


/** Mapeamento KPI (chave do objeto kpis) -> DrillType padrão. */
export const KPI_DRILL_MAP: Record<string, DrillType> = {
  faturamento:    'NOTA_FISCAL',
  fat_liquido:    'NOTA_FISCAL',
  impostos:       'DETALHES_IMPOSTOS',
  devolucao:      'NOTA_FISCAL',
  numero_vendas:  'NOTA_FISCAL',
  numero_clientes:'CLIENTE',
  numero_estados: 'ESTADO',
  quantidade:     'PRODUTO',
  ticket_medio:   'NOTA_FISCAL',
  preco_medio:    'PRODUTO',
  meta:           'NOTA_FISCAL',
  diferenca:      'NOTA_FISCAL',
  pct_atingimento:'NOTA_FISCAL',
};

/** Mapeia uma dimensão do catálogo de séries para o DrillType correspondente. */
export function drillTypeFromDim(dim: string | undefined | null): DrillType {
  switch (dim) {
    case 'mensal':       return 'MENSAL';
    case 'cd_estado':
    case 'estado':       return 'ESTADO';
    case 'cd_cliente':
    case 'cliente':      return 'CLIENTE';
    case 'cd_rev_pedido':
    case 'revenda':      return 'REVENDA';
    case 'cd_produto':
    case 'produto':      return 'PRODUTO';
    case 'cd_nf':
    case 'nota_fiscal':  return 'NOTA_FISCAL';
    case 'cd_prj':
    case 'obra':         return 'NOTA_FISCAL';
    default:             return 'NOTA_FISCAL';
  }
}

/** Deriva DrillType a partir de uma seriesKey no formato `<dim>__<metric>` ou `por_<dim>__<metric>`. */
export function drillTypeFromSeriesKey(seriesKey: string | undefined | null): DrillType {
  if (!seriesKey) return 'NOTA_FISCAL';
  const m = /^(?:por_)?([a-z0-9_]+?)__/i.exec(seriesKey) || /^([a-z0-9_]+)$/i.exec(seriesKey);
  const dim = m?.[1] ?? '';
  if (dim === 'mensal' || dim === 'anual') return 'MENSAL';
  return drillTypeFromDim(dim);
}
