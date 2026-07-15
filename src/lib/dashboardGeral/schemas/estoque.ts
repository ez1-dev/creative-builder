import { z } from 'zod';
import { zNum, zStr, zArr } from './_utils';

const Row = z.preprocess(
  (o: any) => ({
    codigo: o?.codigo ?? o?.codpro ?? '',
    descricao: o?.descricao ?? o?.despro ?? '',
    saldo_atual: o?.saldo_atual ?? o?.saldo ?? 0,
    estoque_minimo: o?.estoque_minimo ?? o?.minimo ?? 0,
  }),
  z.object({
    codigo: zStr(40),
    descricao: zStr(80),
    saldo_atual: zNum,
    estoque_minimo: zNum,
  }),
);

const Resumo = z.preprocess(
  (o: any) => ({
    abaixo_minimo: o?.abaixo_minimo ?? 0,
    acima_maximo: o?.acima_maximo ?? 0,
    sem_politica: o?.sem_politica ?? 0,
    ok: o?.ok ?? 0,
  }),
  z.object({ abaixo_minimo: zNum, acima_maximo: zNum, sem_politica: zNum, ok: zNum }),
);

export const EstoqueMinMaxResponseSchema = z.preprocess(
  (o: any) => ({
    dados: o?.dados ?? [],
    resumo: o?.resumo ?? {},
    total_registros: o?.total_registros ?? 0,
  }),
  z.object({ dados: zArr(Row), resumo: Resumo, total_registros: zNum }),
);
export type EstoqueMinMaxResponseSlim = z.infer<typeof EstoqueMinMaxResponseSchema>;

export const EMPTY_ESTOQUE: EstoqueMinMaxResponseSlim = {
  dados: [],
  resumo: { abaixo_minimo: 0, acima_maximo: 0, sem_politica: 0, ok: 0 },
  total_registros: 0,
};
