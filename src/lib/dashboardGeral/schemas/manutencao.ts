import { z } from 'zod';
import { zNum, zStr, zArr } from './_utils';

const Row = z.preprocess(
  (o: any) => ({
    placa: o?.placa ?? '',
    veiculo_descricao: o?.veiculo_descricao ?? '',
    maquina: o?.maquina ?? '',
    categoria: o?.categoria ?? '',
    valor: o?.valor ?? 0,
    data: o?.data ?? '',
  }),
  z.object({
    placa: zStr(20),
    veiculo_descricao: zStr(60),
    maquina: zStr(60),
    categoria: zStr(40),
    valor: zNum,
    data: zStr(20),
  }),
);

export const ManutencaoRowsSchema = zArr(Row);
export type ManutencaoRow = z.infer<typeof Row>;
export const EMPTY_MANUT: ManutencaoRow[] = [];
