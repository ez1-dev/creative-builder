import { formatEstadoLabel } from './ufLabels';

export type LabelDimension =
  | 'cliente'
  | 'revenda'
  | 'estado'
  | 'obra'
  | 'produto';

interface DimSpec {
  codeKeys: string[];
  nameKeys: string[];
  labelKeys: string[];
}

const DIM_SPECS: Record<LabelDimension, DimSpec> = {
  cliente: {
    codeKeys: ['cd_cliente'],
    nameKeys: ['nm_cliente', 'nm_fantasia', 'cliente'],
    labelKeys: ['cliente_label', 'display_label'],
  },
  revenda: {
    codeKeys: ['cd_rev_pedido', 'cd_revenda'],
    nameKeys: ['nm_revenda', 'ds_revenda', 'revenda', 'nm_fantasia'],
    labelKeys: ['revenda_label', 'display_label'],
  },
  estado: {
    codeKeys: ['cd_estado', 'uf', 'sg_uf'],
    nameKeys: ['nm_estado', 'estado'],
    labelKeys: ['estado_label', 'display_label'],
  },
  obra: {
    codeKeys: ['cd_prj', 'numero_projeto', 'cd_projeto'],
    nameKeys: ['ds_obra', 'ds_abr_prj', 'nm_projeto', 'nome_projeto', 'projeto'],
    labelKeys: ['obra_label', 'projeto_label', 'display_label'],
  },
  produto: {
    codeKeys: ['cd_produto'],
    nameKeys: ['ds_produto', 'descricao_produto', 'descricao', 'nm_produto'],
    labelKeys: ['produto_label', 'display_label'],
  },
};

function firstNonEmpty(row: Record<string, any>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row?.[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s && s !== '-' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined') return s;
  }
  return undefined;
}

/**
 * Adapter genérico para resolver o melhor "rótulo de apresentação" de uma
 * dimensão a partir de uma linha que pode vir do backend com diferentes
 * formatos (apenas código, código+nome, ou já com `*_label` pronto).
 *
 * Prioridade:
 *  1. `*_label` (backend já formatou)
 *  2. `código - nome` quando ambos vierem na linha
 *  3. nome puro quando só o nome vier
 *  4. fallback do catálogo de UFs para `estado`
 *  5. código puro
 */
export function pickDimensionLabel(
  row: Record<string, any> | null | undefined,
  dim: LabelDimension,
): string {
  if (!row) return '';
  const spec = DIM_SPECS[dim];
  const fromLabel = firstNonEmpty(row, spec.labelKeys);
  if (fromLabel) return fromLabel;
  const code = firstNonEmpty(row, spec.codeKeys);
  const name = firstNonEmpty(row, spec.nameKeys);
  if (code && name) return `${code} - ${name}`;
  if (name) return name;
  if (dim === 'estado' && code) return formatEstadoLabel(code);
  return code ?? '';
}

/** Igual a pickDimensionLabel mas devolve apenas o código (para cross-filter). */
export function pickDimensionCode(
  row: Record<string, any> | null | undefined,
  dim: LabelDimension,
): string | undefined {
  if (!row) return undefined;
  return firstNonEmpty(row, DIM_SPECS[dim].codeKeys);
}
