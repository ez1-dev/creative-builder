import { z } from 'zod';
import { zNum, zStr, zArr } from './_utils';

/**
 * Preprocess que consolida os aliases comuns da API de faturamento:
 * `valor_total | valor | fat_liquido | faturamento_liquido | faturamento`.
 */
const valorAlias = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  return {
    ...obj,
    valor_total:
      obj.valor_total ??
      obj.valor ??
      obj.fat_liquido ??
      obj.faturamento_liquido ??
      obj.faturamento ??
      obj.faturamento_total ??
      0,
  };
};

const KpisSchema = z
  .preprocess(
    (o: any) => ({
      valor_total:
        o?.valor_total ?? o?.fat_liquido ?? o?.faturamento_liquido ?? o?.faturamento ?? 0,
      meta_faturamento: o?.meta_faturamento ?? o?.meta ?? o?.meta_total ?? 0,
      quantidade_notas: o?.quantidade_notas ?? o?.qtd_notas ?? o?.count_notas ?? 0,
      valor_desconto: o?.valor_desconto ?? o?.desconto_total ?? 0,
      ticket_medio: o?.ticket_medio ?? 0,
    }),
    z.object({
      valor_total: zNum,
      meta_faturamento: zNum,
      quantidade_notas: zNum,
      valor_desconto: zNum,
      ticket_medio: zNum,
    }),
  );

const PorMesRow = z.preprocess(valorAlias, z.object({
  anomes: zStr(10).optional().default(''),
  mes: zStr(10).optional().default(''),
  valor_total: zNum,
  meta: zNum.optional().default(0),
}));

const PorRevendaRow = z.preprocess(valorAlias, z.object({
  revenda: zStr(60).optional().default(''),
  nome: zStr(60).optional().default(''),
  valor_total: zNum,
}));

const PorProdutoRow = z.preprocess(valorAlias, z.object({
  produto: zStr(80).optional().default(''),
  descricao: zStr(80).optional().default(''),
  nome: zStr(80).optional().default(''),
  valor_total: zNum,
}));

const PorUfRow = z.preprocess(valorAlias, z.object({
  uf: zStr(4).optional().default(''),
  estado: zStr(30).optional().default(''),
  valor_total: zNum,
}));

export const FaturamentoGeniusResponseSchema = z.preprocess(
  (o: any) => ({
    kpis: o?.kpis ?? {},
    por_mes: o?.por_mes ?? o?.graficos?.por_mes ?? [],
    por_revenda: o?.por_revenda ?? o?.graficos?.por_revenda ?? [],
    por_produto: o?.por_produto ?? o?.graficos?.por_produto ?? [],
    por_uf: o?.por_uf ?? o?.por_estado ?? o?.graficos?.por_uf ?? [],
  }),
  z.object({
    kpis: KpisSchema,
    por_mes: zArr(PorMesRow),
    por_revenda: zArr(PorRevendaRow),
    por_produto: zArr(PorProdutoRow),
    por_uf: zArr(PorUfRow),
  }),
);

export type FaturamentoGeniusResponse = z.infer<typeof FaturamentoGeniusResponseSchema>;

export const EMPTY_FATURAMENTO: FaturamentoGeniusResponse = {
  kpis: { valor_total: 0, meta_faturamento: 0, quantidade_notas: 0, valor_desconto: 0, ticket_medio: 0 },
  por_mes: [],
  por_revenda: [],
  por_produto: [],
  por_uf: [],
};
