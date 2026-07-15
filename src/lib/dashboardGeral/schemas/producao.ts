import { z } from 'zod';
import { zNum, zStr, zArr } from './_utils';

const CentroRow = z.preprocess(
  (o: any) => ({
    descre: o?.descre ?? o?.codcre ?? '',
    carga_prevista_horas: o?.carga_prevista_horas ?? 0,
  }),
  z.object({ descre: zStr(40), carga_prevista_horas: zNum }),
);

const RecursoRow = z.preprocess(
  (o: any) => ({
    unidade_negocio: o?.unidade_negocio ?? '',
    carga_prevista_horas: o?.carga_prevista_horas ?? 0,
  }),
  z.object({ unidade_negocio: zStr(60), carga_prevista_horas: zNum }),
);

const Resumo = z.preprocess(
  (o: any) => ({
    qtd_ops: o?.qtd_ops ?? 0,
    qtd_recursos: o?.qtd_recursos ?? 0,
    carga_prevista_horas: o?.carga_prevista_horas ?? 0,
    qtd_linhas_operacao: o?.qtd_linhas_operacao ?? 0,
    linhas_sem_mapeamento: o?.linhas_sem_mapeamento ?? 0,
  }),
  z.object({
    qtd_ops: zNum,
    qtd_recursos: zNum,
    carga_prevista_horas: zNum,
    qtd_linhas_operacao: zNum,
    linhas_sem_mapeamento: zNum,
  }),
);

export const CargaCentrosResponseSchema = z.preprocess(
  (o: any) => ({ dados: o?.dados ?? [], resumo: o?.resumo ?? {} }),
  z.object({ dados: zArr(CentroRow), resumo: Resumo }),
);
export type CargaCentrosResponse = z.infer<typeof CargaCentrosResponseSchema>;

export const CargaRecursosResponseSchema = z.preprocess(
  (o: any) => ({ dados: o?.dados ?? [] }),
  z.object({ dados: zArr(RecursoRow) }),
);
export type CargaRecursosResponse = z.infer<typeof CargaRecursosResponseSchema>;

export const EMPTY_CENTROS: CargaCentrosResponse = {
  dados: [],
  resumo: { qtd_ops: 0, qtd_recursos: 0, carga_prevista_horas: 0, qtd_linhas_operacao: 0, linhas_sem_mapeamento: 0 },
};
export const EMPTY_RECURSOS: CargaRecursosResponse = { dados: [] };
