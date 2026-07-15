import { z } from 'zod';
import { zNum, zStr, zArr } from './_utils';

const TotaisSchema = z.preprocess(
  (o: any) => ({
    receita_operacional: o?.receita_operacional ?? o?.receita ?? 0,
    custos: o?.custos ?? 0,
    despesas: o?.despesas ?? 0,
    resultado_dre: o?.resultado_dre ?? o?.resultado ?? 0,
    margem_pct: o?.margem_pct ?? o?.margem ?? 0,
  }),
  z.object({
    receita_operacional: zNum,
    custos: zNum,
    despesas: zNum,
    resultado_dre: zNum,
    margem_pct: zNum,
  }),
);

const MensalRow = z.preprocess(
  (o: any) => ({
    anomes: o?.anomes ?? '',
    resultado_dre: o?.resultado_dre ?? o?.resultado ?? 0,
    receita_operacional: o?.receita_operacional ?? o?.receita ?? 0,
  }),
  z.object({
    anomes: zStr(10),
    resultado_dre: zNum,
    receita_operacional: zNum,
  }),
);

export const DreResumoResponseSchema = z.preprocess(
  (o: any) => ({ totais: o?.totais ?? {}, mensal: o?.mensal ?? [] }),
  z.object({ totais: TotaisSchema, mensal: zArr(MensalRow) }),
);

export type DreResumoResponse = z.infer<typeof DreResumoResponseSchema>;

export const EMPTY_DRE: DreResumoResponse = {
  totais: { receita_operacional: 0, custos: 0, despesas: 0, resultado_dre: 0, margem_pct: 0 },
  mensal: [],
};

const ContasResumoSchema = z.preprocess(
  (o: any) => ({
    valor_aberto_total: o?.valor_aberto_total ?? o?.valor_original_total ?? 0,
    valor_original_total: o?.valor_original_total ?? 0,
    valor_vencido_total: o?.valor_vencido_total ?? 0,
  }),
  z.object({
    valor_aberto_total: zNum,
    valor_original_total: zNum,
    valor_vencido_total: zNum,
  }),
);

export const ContasResponseSchema = z.preprocess(
  (o: any) => ({ resumo: o?.resumo ?? {} }),
  z.object({ resumo: ContasResumoSchema }),
);

export type ContasResponseSlim = z.infer<typeof ContasResponseSchema>;

export const EMPTY_CONTAS: ContasResponseSlim = {
  resumo: { valor_aberto_total: 0, valor_original_total: 0, valor_vencido_total: 0 },
};
