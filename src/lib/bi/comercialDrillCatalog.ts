import type { DrillType, DrillContexto } from './comercialDrillApi';

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

export const NEXT_DRILLS: Record<DrillType, DrillType[]> = {
  ACUMULADO: ['MENSAL', 'ESTADO', 'CLIENTE', 'REVENDA', 'PRODUTO', 'NOTA_FISCAL'],
  MENSAL: ['ESTADO', 'CLIENTE', 'REVENDA', 'PRODUTO', 'NOTA_FISCAL'],
  ESTADO: ['CLIENTE', 'REVENDA', 'PRODUTO', 'NOTA_FISCAL'],
  CLIENTE: ['REVENDA', 'PRODUTO', 'NOTA_FISCAL'],
  REVENDA: ['CLIENTE', 'PRODUTO', 'NOTA_FISCAL'],
  PRODUTO: ['NOTA_FISCAL', 'DETALHES_IMPOSTOS'],
  NOTA_FISCAL: ['PRODUTO', 'DETALHES_IMPOSTOS'],
  DETALHES_IMPOSTOS: [],
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
