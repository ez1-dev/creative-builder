import { z } from 'zod';
import { zNum, zStr, zArr } from './_utils';

const TurnKpis = z.preprocess(
  (o: any) => ({
    admitidos: o?.admitidos ?? o?.admissoes ?? 0,
    demitidos: o?.demitidos ?? o?.demissoes ?? 0,
    taxa_rotatividade_pct: o?.taxa_rotatividade_pct ?? o?.turnover_pct ?? 0,
  }),
  z.object({ admitidos: zNum, demitidos: zNum, taxa_rotatividade_pct: zNum }),
);

const TurnRow = z.preprocess(
  (o: any) => ({
    anomes: o?.anomes ?? o?.mes ?? '',
    headcount_fim: o?.headcount_fim ?? o?.headcount ?? o?.headcount_medio ?? 0,
    taxa_rotatividade_pct: o?.taxa_rotatividade_pct ?? o?.turnover_pct ?? o?.taxa ?? 0,
  }),
  z.object({ anomes: zStr(10), headcount_fim: zNum, taxa_rotatividade_pct: zNum }),
);

export const TurnoverResponseSchema = z.preprocess(
  (o: any) => ({ kpis: o?.kpis ?? {}, por_mes: o?.por_mes ?? [] }),
  z.object({ kpis: TurnKpis, por_mes: zArr(TurnRow) }),
);
export type TurnoverResponse = z.infer<typeof TurnoverResponseSchema>;
export const EMPTY_TURNOVER: TurnoverResponse = {
  kpis: { admitidos: 0, demitidos: 0, taxa_rotatividade_pct: 0 },
  por_mes: [],
};

const AbsKpis = z.preprocess(
  (o: any) => ({ taxa_absenteismo_pct: o?.taxa_absenteismo_pct ?? o?.absenteismo_pct ?? 0 }),
  z.object({ taxa_absenteismo_pct: zNum }),
);
const AbsMotivo = z.preprocess(
  (o: any) => ({
    motivo: o?.motivo ?? o?.descricao ?? '',
    dias_perdidos: o?.dias_perdidos ?? o?.dias ?? o?.qtd ?? 0,
  }),
  z.object({ motivo: zStr(40), dias_perdidos: zNum }),
);

export const AbsenteismoResponseSchema = z.preprocess(
  (o: any) => ({ kpis: o?.kpis ?? {}, por_motivo: o?.por_motivo ?? [] }),
  z.object({ kpis: AbsKpis, por_motivo: zArr(AbsMotivo) }),
);
export type AbsenteismoResponse = z.infer<typeof AbsenteismoResponseSchema>;
export const EMPTY_ABS: AbsenteismoResponse = {
  kpis: { taxa_absenteismo_pct: 0 },
  por_motivo: [],
};

export const FolhaResponseSchema = z.preprocess(
  (o: any) => ({ kpis: { custo_total: o?.kpis?.custo_total ?? 0 } }),
  z.object({ kpis: z.object({ custo_total: zNum }) }),
);
export type FolhaResponse = z.infer<typeof FolhaResponseSchema>;
export const EMPTY_FOLHA: FolhaResponse = { kpis: { custo_total: 0 } };

const Colab = z.preprocess(
  (o: any) => ({
    situacao: o?.situacao ?? o?.status ?? o?.ds_situacao ?? '',
    setor: o?.setor ?? o?.departamento ?? o?.ds_setor ?? '',
  }),
  z.object({ situacao: zStr(40), setor: zStr(60) }),
);

export const QuadroColaboradoresSchema = zArr(Colab);
export type QuadroColaboradores = z.infer<typeof QuadroColaboradoresSchema>;
export const EMPTY_QUADRO: QuadroColaboradores = [];
