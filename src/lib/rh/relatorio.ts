import { supabase } from "@/integrations/supabase/client";
import {
  fetchResumoFolhaDashboard,
  fetchContratoExperienciaDashboard,
  fetchProgramacaoFeriasDashboard,
  fetchTurnoverDashboard,
  fetchAbsenteismoDashboard,
  fetchQuadroColaboradores,
} from "./api";
import type {
  ResumoFolhaDashboard,
  ContratoExperienciaDashboard,
  ProgramacaoFeriasDashboard,
  TurnoverDashboard,
  AbsenteismoDashboard,
  QuadroColaboradorItem,
} from "./types";

export type Severidade = "CRITICO" | "ALTO" | "MEDIO";

export interface SecaoIa {
  diagnostico: string[];
  riscos: string[];
  recomendacoes: string[];
}

export interface RelatorioIa {
  sumario_executivo: string[];
  secoes: {
    resumo_folha: SecaoIa;
    quadro: SecaoIa;
    contratos_experiencia: SecaoIa;
    ferias: SecaoIa;
    turnover: SecaoIa;
    absenteismo: SecaoIa;
  };
  alertas: Array<{
    titulo: string;
    severidade: Severidade;
    secao: string;
    impacto: string;
    acao: string;
  }>;
  gerado_em?: string;
}

export interface DadosConsolidados {
  periodo: { atual: { ini: string; fim: string }; anterior: { ini: string; fim: string } };
  resumo_folha: { atual: ResumoFolhaDashboard | null; anterior: ResumoFolhaDashboard | null };
  quadro: { atual: { total: number; por_situacao: Record<string, number>; por_filial: Record<string, number>; por_cargo: Record<string, number>; itens: QuadroColaboradorItem[] } };
  contratos_experiencia: { atual: ContratoExperienciaDashboard | null };
  ferias: { atual: ProgramacaoFeriasDashboard | null };
  turnover: { atual: TurnoverDashboard | null; anterior: TurnoverDashboard | null };
  absenteismo: { atual: AbsenteismoDashboard | null; anterior: AbsenteismoDashboard | null };
}

/** Soma N meses a um anomes YYYYMM (pode ser negativo). */
export function addMonths(anomes: string, n: number): string {
  const s = String(anomes);
  if (!/^\d{6}$/.test(s)) return s;
  const y = parseInt(s.slice(0, 4), 10);
  const m = parseInt(s.slice(4, 6), 10);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny.toString().padStart(4, "0")}${nm.toString().padStart(2, "0")}`;
}

/** Retorna nº de meses inclusivo entre ini e fim (YYYYMM). */
export function monthsBetween(ini: string, fim: string): number {
  const y1 = parseInt(ini.slice(0, 4), 10);
  const m1 = parseInt(ini.slice(4, 6), 10);
  const y2 = parseInt(fim.slice(0, 4), 10);
  const m2 = parseInt(fim.slice(4, 6), 10);
  return y2 * 12 + m2 - (y1 * 12 + m1) + 1;
}

/** Calcula janela imediatamente anterior de mesmo tamanho. */
export function periodoAnterior(ini: string, fim: string): { ini: string; fim: string } {
  const len = monthsBetween(ini, fim);
  return { ini: addMonths(ini, -len), fim: addMonths(ini, -1) };
}

function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  return fn().catch((e) => {
    console.warn("[relatorio] erro em fetcher:", e?.message ?? e);
    return null;
  });
}

function tally(items: QuadroColaboradorItem[], keyGetter: (i: any) => string | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = String(keyGetter(it) ?? "-").trim() || "-";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export async function coletarDadosConsolidados(
  anomesIni: string,
  anomesFim: string,
  codemp: number = 1,
): Promise<DadosConsolidados> {
  const ant = periodoAnterior(anomesIni, anomesFim);

  const [
    folhaAtual, folhaAnt,
    contratos,
    ferias,
    turnoverAtual, turnoverAnt,
    absAtual, absAnt,
    quadroItens,
  ] = await Promise.all([
    safe(() => fetchResumoFolhaDashboard({ anomes_ini: anomesIni, anomes_fim: anomesFim, codemp })),
    safe(() => fetchResumoFolhaDashboard({ anomes_ini: ant.ini, anomes_fim: ant.fim, codemp })),
    safe(() => fetchContratoExperienciaDashboard(codemp)),
    safe(() => fetchProgramacaoFeriasDashboard(codemp)),
    safe(() => fetchTurnoverDashboard({ anomes_ini: anomesIni, anomes_fim: anomesFim, codemp })),
    safe(() => fetchTurnoverDashboard({ anomes_ini: ant.ini, anomes_fim: ant.fim, codemp })),
    safe(() => fetchAbsenteismoDashboard({ anomes_ini: anomesIni, anomes_fim: anomesFim, codemp })),
    safe(() => fetchAbsenteismoDashboard({ anomes_ini: ant.ini, anomes_fim: ant.fim, codemp })),
    safe(() => fetchQuadroColaboradores()),
  ]);

  const itens = quadroItens ?? [];
  return {
    periodo: { atual: { ini: anomesIni, fim: anomesFim }, anterior: ant },
    resumo_folha: { atual: folhaAtual, anterior: folhaAnt },
    quadro: {
      atual: {
        total: itens.length,
        por_situacao: tally(itens, (i) => i.situacao ?? i.ds_situacao ?? i.status),
        por_filial: tally(itens, (i) => i.filial ?? i.ds_filial ?? i.nm_filial),
        por_cargo: tally(itens, (i) => i.cargo ?? i.ds_cargo),
        itens,
      },
    },
    contratos_experiencia: { atual: contratos },
    ferias: { atual: ferias },
    turnover: { atual: turnoverAtual, anterior: turnoverAnt },
    absenteismo: { atual: absAtual, anterior: absAnt },
  };
}

/** Reduz payload para chamada IA (sem detalhes gigantes). */
function payloadParaIa(d: DadosConsolidados) {
  const cutArr = <T,>(arr: T[] | undefined, n = 10): T[] => (Array.isArray(arr) ? arr.slice(0, n) : []);
  return {
    resumo_folha: {
      atual: d.resumo_folha.atual && {
        kpis: d.resumo_folha.atual.kpis,
        top_proventos: cutArr(d.resumo_folha.atual.proventos_vantagens, 8),
        top_descontos: cutArr(d.resumo_folha.atual.descontos, 8),
        mensal: cutArr(d.resumo_folha.atual.mensal, 24),
      },
      anterior: d.resumo_folha.anterior && { kpis: d.resumo_folha.anterior.kpis },
    },
    quadro: {
      atual: {
        total: d.quadro.atual.total,
        por_situacao: d.quadro.atual.por_situacao,
        top_filiais: Object.entries(d.quadro.atual.por_filial).sort((a, b) => b[1] - a[1]).slice(0, 10),
        top_cargos: Object.entries(d.quadro.atual.por_cargo).sort((a, b) => b[1] - a[1]).slice(0, 10),
      },
    },
    contratos_experiencia: {
      atual: d.contratos_experiencia.atual && {
        kpis: d.contratos_experiencia.atual.kpis,
        vencimentos_amostra: cutArr(d.contratos_experiencia.atual.vencimentos, 10),
      },
    },
    ferias: {
      atual: d.ferias.atual && {
        kpis: d.ferias.atual.kpis,
        limite_pivot: cutArr(d.ferias.atual.limite_ferias_pivot, 6),
        sem_programacao_amostra: cutArr(d.ferias.atual.primeiro_vencimento_sem_programacao, 10),
      },
    },
    turnover: {
      atual: d.turnover.atual && {
        kpis: d.turnover.atual.kpis,
        por_mes: cutArr(d.turnover.atual.por_mes, 24),
        por_motivo: cutArr(d.turnover.atual.por_motivo, 10),
      },
      anterior: d.turnover.anterior && { kpis: d.turnover.anterior.kpis },
    },
    absenteismo: {
      atual: d.absenteismo.atual && {
        kpis: d.absenteismo.atual.kpis,
        por_categoria: cutArr(d.absenteismo.atual.por_categoria, 10),
        por_motivo: cutArr(d.absenteismo.atual.por_motivo, 10),
        por_mes: cutArr(d.absenteismo.atual.por_mes, 24),
      },
      anterior: d.absenteismo.anterior && { kpis: d.absenteismo.anterior.kpis },
    },
  };
}

export async function gerarAnaliseIa(d: DadosConsolidados): Promise<RelatorioIa> {
  const { data, error } = await supabase.functions.invoke("rh-relatorio-ia", {
    body: { payload: payloadParaIa(d), periodo: d.periodo },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as RelatorioIa;
}

/** Δ absoluto e percentual. */
export function delta(atual?: number | null, anterior?: number | null) {
  const a = Number(atual ?? 0);
  const b = Number(anterior ?? 0);
  const diff = a - b;
  const pct = b !== 0 ? (diff / Math.abs(b)) * 100 : (a !== 0 ? 100 : 0);
  return { abs: diff, pct };
}
