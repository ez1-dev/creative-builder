import type { DrillType, DrillContexto } from './comercialDrillApi';
import { cleanDrillValue } from './comercialDrillContract';

export const DRILL_LABELS: Record<DrillType, string> = {
  ACUMULADO: 'Acumulado',
  MENSAL: 'Mensal',
  ESTADO: 'Estado',
  CLIENTE: 'Cliente',
  REVENDA: 'Revenda',
  PRODUTO: 'Produto',
  NOTA_FISCAL: 'Nota Fiscal',
  DETALHES_IMPOSTOS: 'Detalhes Impostos',
};

/**
 * Lista de drill_types habilitados na UI. Os 3 novos (OBRA/PROJETO/TIPO_SERVICO)
 * dependem de suporte no backend FastAPI — ver docs/backend-bi-comercial-drills-novos.md.
 * Quando o endpoint /api/bi/comercial/drill aceitar esses tipos, basta acrescentar
 * aqui (e em DrillType + DRILL_LABELS + ROW_TO_CTX_KEY + ALLOWED_CTX_KEYS).
 */
export const ENABLED_DRILLS: ReadonlySet<DrillType> = new Set<DrillType>([
  'ACUMULADO', 'MENSAL', 'ESTADO', 'CLIENTE', 'REVENDA',
  'PRODUTO', 'NOTA_FISCAL', 'DETALHES_IMPOSTOS',
]);

/**
 * Cada nível pode navegar para qualquer outro (exceto ele mesmo). O backend
 * resolve qualquer combinação de filtros via contexto. A UI filtra por
 * ENABLED_DRILLS na renderização do menu.
 */
const ALL_DRILLS: DrillType[] = [
  'MENSAL', 'ESTADO', 'CLIENTE', 'REVENDA', 'PRODUTO',
  'NOTA_FISCAL', 'DETALHES_IMPOSTOS', 'ACUMULADO',
];
function nextFor(self: DrillType): DrillType[] {
  return ALL_DRILLS.filter((d) => d !== self);
}
export const NEXT_DRILLS: Record<DrillType, DrillType[]> = {
  ACUMULADO: nextFor('ACUMULADO'),
  MENSAL: nextFor('MENSAL'),
  ESTADO: nextFor('ESTADO'),
  CLIENTE: nextFor('CLIENTE'),
  REVENDA: nextFor('REVENDA'),
  PRODUTO: nextFor('PRODUTO'),
  NOTA_FISCAL: nextFor('NOTA_FISCAL'),
  DETALHES_IMPOSTOS: nextFor('DETALHES_IMPOSTOS'),
};


/**
 * Para cada drill_type, qual chave do contexto representa a "dimensão"
 * agrupadora — usada para empurrar o próximo nível a partir de uma linha.
 */
export const ROW_TO_CTX_KEY: Record<DrillType, (keyof DrillContexto) | null> = {
  ACUMULADO: null,
  MENSAL: 'anomes_emissao',
  ESTADO: 'cd_estado',
  CLIENTE: 'cd_cliente',
  REVENDA: 'cd_rev_pedido',
  PRODUTO: 'cd_produto',
  NOTA_FISCAL: 'cd_nf',
  DETALHES_IMPOSTOS: 'cd_nf',
};

/** Mapeia uma dimensão usada na IA (AiDimensao) para o drill_type equivalente. */
export function aiDimensaoToDrillType(dim: string): { drill_type: DrillType; ctxKey: keyof DrillContexto | null } {
  switch (dim) {
    case 'anomes_emissao': return { drill_type: 'MENSAL', ctxKey: 'anomes_emissao' };
    case 'cd_estado': return { drill_type: 'ESTADO', ctxKey: 'cd_estado' };
    case 'cd_cliente': return { drill_type: 'CLIENTE', ctxKey: 'cd_cliente' };
    case 'cd_rev_pedido': return { drill_type: 'REVENDA', ctxKey: 'cd_rev_pedido' };
    case 'cd_prj': return { drill_type: 'ACUMULADO', ctxKey: 'cd_prj' };
    case 'cd_tns': return { drill_type: 'ACUMULADO', ctxKey: 'cd_tns' };
    case 'cd_origem': return { drill_type: 'ACUMULADO', ctxKey: 'cd_origem' };
    case 'cd_tp_movimento': return { drill_type: 'ACUMULADO', ctxKey: 'cd_tp_movimento' };
    case 'categoria_custom': return { drill_type: 'ACUMULADO', ctxKey: 'categoria_custom' };
    case 'unidade_negocio': return { drill_type: 'ACUMULADO', ctxKey: null };
    default: return { drill_type: 'ACUMULADO', ctxKey: null };
  }
}

/**
 * Para cada drill_type alvo, quais chaves do contexto podem sobreviver
 * vindas do nível anterior. Tudo que não estiver listado é descartado para
 * evitar combinações impossíveis (ex.: cd_cliente carregado para REVENDA).
 */
export const ALLOWED_CTX_KEYS: Record<DrillType, (keyof DrillContexto)[]> = {
  ACUMULADO: [
    'anomes_emissao', 'cd_origem', 'cd_estado', 'cd_cliente', 'cd_rev_pedido',
    'cd_prj', 'cd_tns', 'cd_tp_movimento', 'cd_nf', 'cd_produto', 'categoria_custom',
  ],
  MENSAL: ['anomes_emissao', 'cd_origem', 'categoria_custom'],
  ESTADO: ['anomes_emissao', 'cd_estado', 'cd_origem', 'categoria_custom'],
  CLIENTE: ['anomes_emissao', 'cd_estado', 'cd_cliente', 'cd_origem', 'categoria_custom'],
  REVENDA: ['anomes_emissao', 'cd_estado', 'cd_rev_pedido', 'cd_origem', 'categoria_custom'],
  PRODUTO: [
    'anomes_emissao', 'cd_estado', 'cd_cliente', 'cd_rev_pedido', 'cd_produto',
    'cd_origem', 'categoria_custom',
  ],
  NOTA_FISCAL: [
    'anomes_emissao', 'cd_estado', 'cd_cliente', 'cd_rev_pedido', 'cd_nf',
    'cd_origem', 'cd_tns', 'cd_tp_movimento', 'cd_prj', 'categoria_custom',
  ],
  DETALHES_IMPOSTOS: [
    'anomes_emissao', 'cd_estado', 'cd_cliente', 'cd_rev_pedido', 'cd_produto',
    'cd_derivacao', 'cd_nf', 'cd_origem', 'cd_tns', 'cd_tp_movimento', 'cd_prj',
  ],

};

/**
 * Calcula o contexto do próximo nível do drill.
 * - keepAll=true (clique em linha ou troca de drill): mantém só chaves
 *   compatíveis do contexto atual e aplica rowFilters por cima (row vence).
 * - keepAll=false (replacePath): ignora contexto atual.
 */
export function mergeCtx(
  currentCtx: DrillContexto,
  rowFilters: DrillContexto,
  nextDrill: DrillType,
  opts: { keepAll: boolean } = { keepAll: true },
): DrillContexto {
  const allowed = new Set(ALLOWED_CTX_KEYS[nextDrill]);
  const out: DrillContexto = {};
  if (opts.keepAll) {
    (Object.keys(currentCtx) as (keyof DrillContexto)[]).forEach((k) => {
      const v = cleanDrillValue(currentCtx[k]);
      if (v != null && allowed.has(k)) (out as any)[k] = v;
    });
  }
  (Object.keys(rowFilters || {}) as (keyof DrillContexto)[]).forEach((k) => {
    const v = cleanDrillValue((rowFilters as any)[k]);
    if (v != null && allowed.has(k)) (out as any)[k] = v;
  });
  return out;
}

export const CTX_LABELS: Partial<Record<keyof DrillContexto, string>> = {
  anomes_emissao: 'Mês',
  cd_origem: 'Origem',
  cd_estado: 'UF',
  cd_cliente: 'Cliente',
  cd_rev_pedido: 'Revenda',
  cd_prj: 'Obra',
  cd_tns: 'TNS',
  cd_tp_movimento: 'Mov.',
  cd_nf: 'NF',
  cd_produto: 'Produto',
  cd_derivacao: 'Derivação',
  categoria_custom: 'Categoria',

};

