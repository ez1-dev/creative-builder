import { z } from 'zod';
import { zNum, zStr, zArr } from './_utils';

const valorAlias = (o: any) => {
  if (!o || typeof o !== 'object') return o;
  return { ...o, valor: o.valor ?? o.valor_total ?? o.valor_liquido ?? 0 };
};

const KpisSchema = z.preprocess(
  (o: any) => ({
    valor_comprado: o?.valor_comprado ?? o?.valor_liquido_total ?? 0,
    valor_pendente_total: o?.valor_pendente_total ?? o?.valor_pendente ?? 0,
    total_ocs: o?.total_ocs ?? o?.quantidade_ocs ?? 0,
    ocs_atrasadas: o?.ocs_atrasadas ?? 0,
    itens_atrasados: o?.itens_atrasados ?? 0,
    itens_pendentes: o?.itens_pendentes ?? 0,
    total_fornecedores: o?.total_fornecedores ?? o?.quantidade_fornecedores ?? 0,
    ticket_medio_oc: o?.ticket_medio_oc ?? 0,
  }),
  z.object({
    valor_comprado: zNum,
    valor_pendente_total: zNum,
    total_ocs: zNum,
    ocs_atrasadas: zNum,
    itens_atrasados: zNum,
    itens_pendentes: zNum,
    total_fornecedores: zNum,
    ticket_medio_oc: zNum,
  }),
);

const PorMesRow = z.preprocess(valorAlias, z.object({
  mes: zStr(10).optional().default(''),
  anomes: zStr(10).optional().default(''),
  valor: zNum,
}));

const PorTipoRow = z.preprocess(valorAlias, z.object({
  tipo_despesa: zStr(50).optional().default(''),
  tipo: zStr(50).optional().default(''),
  label: zStr(50).optional().default(''),
  valor: zNum,
}));

const PorFornecedorRow = z.preprocess(valorAlias, z.object({
  fornecedor: zStr(80).optional().default(''),
  nome: zStr(80).optional().default(''),
  razao_social: zStr(80).optional().default(''),
  valor: zNum,
}));

export const PainelComprasResponseSchema = z.preprocess(
  (o: any) => ({
    kpis: o?.kpis ?? {},
    graficos: {
      por_mes: o?.graficos?.por_mes ?? [],
      por_tipo_despesa: o?.graficos?.por_tipo_despesa ?? [],
      por_fornecedor: o?.graficos?.por_fornecedor ?? [],
    },
  }),
  z.object({
    kpis: KpisSchema,
    graficos: z.object({
      por_mes: zArr(PorMesRow),
      por_tipo_despesa: zArr(PorTipoRow),
      por_fornecedor: zArr(PorFornecedorRow),
    }),
  }),
);

export type PainelComprasResponse = z.infer<typeof PainelComprasResponseSchema>;

export const EMPTY_COMPRAS: PainelComprasResponse = {
  kpis: {
    valor_comprado: 0, valor_pendente_total: 0, total_ocs: 0, ocs_atrasadas: 0,
    itens_atrasados: 0, itens_pendentes: 0, total_fornecedores: 0, ticket_medio_oc: 0,
  },
  graficos: { por_mes: [], por_tipo_despesa: [], por_fornecedor: [] },
};
