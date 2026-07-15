import { z } from 'zod';
import { zNum, zStr, zArr } from './_utils';

const LinhaBalanco = z.preprocess(
  (o: any) => ({
    grupo: o?.grupo ?? o?.descricao_grupo ?? '',
    saldo_atual: o?.saldo_atual ?? o?.saldo ?? o?.valor ?? 0,
  }),
  z.object({ grupo: zStr(80), saldo_atual: zNum }),
);

export const BalancoResponseSchema = z.preprocess(
  (o: any) => ({ dados: o?.dados ?? o?.linhas ?? [] }),
  z.object({ dados: zArr(LinhaBalanco) }),
);

export type BalancoResponse = z.infer<typeof BalancoResponseSchema>;

export const EMPTY_BALANCO: BalancoResponse = { dados: [] };
