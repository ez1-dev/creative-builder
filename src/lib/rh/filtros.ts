import type {
  ContratoExperienciaDashboard,
  ContratoExperienciaVencimento,
  ProgramacaoFeriasDashboard,
  ProgramacaoFeriasDetalheItem,
  LimiteFeriasPivotRow,
} from "./types";

/** Extrai AAAAMM de uma data ISO (YYYY-MM-DD) ou de valores no formato AAAAMM. */
function anomesFromIso(v?: string | null): string {
  if (!v) return "";
  const s = String(v);
  if (/^\d{6}$/.test(s)) return s;
  const m = /^(\d{4})-(\d{2})/.exec(s);
  return m ? `${m[1]}${m[2]}` : "";
}

function withinRange(anomes: string, ini: string, fim: string): boolean {
  if (!anomes) return false;
  if (ini && anomes < ini) return false;
  if (fim && anomes > fim) return false;
  return true;
}

/**
 * Aplica filtro de período (AAAAMM) client-side sobre os vencimentos
 * do dashboard de contratos de experiência e recalcula os KPIs
 * derivados a partir da lista filtrada. `demitidos_30_apos_exp` permanece
 * pois não é possível recomputá-lo com precisão a partir da lista.
 */
export function filtrarContratosPorPeriodo(
  dash: ContratoExperienciaDashboard | null | undefined,
  ini: string,
  fim: string,
): ContratoExperienciaDashboard | null {
  if (!dash) return null;
  if (!ini && !fim) return dash;
  const venc = (dash.vencimentos ?? []).filter((v: ContratoExperienciaVencimento) =>
    withinRange(anomesFromIso(v.dt_vencimento), ini, fim),
  );
  const norm = (s?: string) => (s || "").toUpperCase().trim();
  const a5 = venc.filter((v) => norm(v.status) === "A VENCER 5 DIAS").length;
  const a10 = venc.filter((v) => norm(v.status) === "A VENCER 10 DIAS").length;
  return {
    ...dash,
    vencimentos: venc,
    kpis: {
      ...dash.kpis,
      qtde_contratos: venc.length,
      a_vencer_5_dias: a5,
      a_vencer_10_dias: a10,
    },
  };
}

function getAnoMesLimite(x: ProgramacaoFeriasDetalheItem): string {
  const ano =
    x.ano_limite != null && x.ano_limite !== "" ? String(x.ano_limite) : "";
  const mesRaw =
    x.mes_limite != null && x.mes_limite !== ("" as any) ? Number(x.mes_limite) : NaN;
  if (ano && Number.isFinite(mesRaw)) {
    return `${ano}${String(mesRaw).padStart(2, "0")}`;
  }
  return anomesFromIso(x.dt_limite_saida);
}

/**
 * Aplica filtro de período (AAAAMM) client-side sobre a Programação de Férias
 * usando `dt_limite_saida` como referência. Recalcula pivot e KPIs a partir
 * do detalhe filtrado. `de_ferias` (colaboradores atualmente de férias) é mantido
 * pois não depende da janela do limite.
 */
export function filtrarFeriasPorPeriodo(
  dash: ProgramacaoFeriasDashboard | null | undefined,
  ini: string,
  fim: string,
): ProgramacaoFeriasDashboard | null {
  if (!dash) return null;
  if (!ini && !fim) return dash;

  const detalhe = (dash.detalhe ?? []).filter((x) =>
    withinRange(getAnoMesLimite(x), ini, fim),
  );

  const prox90 = (dash.programacao_proximos_90_dias ?? []).filter((x) =>
    withinRange(anomesFromIso(x.dt_limite_saida), ini, fim),
  );

  const sem = (dash.primeiro_vencimento_sem_programacao ?? []).filter((x) =>
    withinRange(anomesFromIso(x.dt_limite_saida), ini, fim),
  );

  // Recalcula pivot ano×mês a partir do detalhe filtrado
  const pivotMap = new Map<string, LimiteFeriasPivotRow>();
  for (const x of detalhe) {
    const am = getAnoMesLimite(x);
    if (!am) continue;
    const ano = am.slice(0, 4);
    const mes = Number(am.slice(4, 6));
    if (!Number.isFinite(mes) || mes < 1 || mes > 12) continue;
    let row = pivotMap.get(ano);
    if (!row) {
      row = {
        ano,
        m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
        m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0,
        total: 0,
      };
      pivotMap.set(ano, row);
    }
    const key = `m${mes}` as keyof LimiteFeriasPivotRow;
    (row as any)[key] = (row as any)[key] + 1;
    row.total += 1;
  }
  const pivot = Array.from(pivotMap.values()).sort((a, b) => a.ano.localeCompare(b.ano));

  const normStatus = (s?: string) => (s || "").toUpperCase().trim();
  const kpis = {
    ...dash.kpis,
    ferias_vencidas: detalhe.filter((x) => normStatus(x.status) === "VENCIDA").length,
    a_vencer_30: detalhe.filter((x) => normStatus(x.status) === "A VENCER 30 DIAS").length,
    a_vencer_60: detalhe.filter((x) => normStatus(x.status) === "A VENCER 60 DIAS").length,
    a_vencer_90: detalhe.filter((x) => normStatus(x.status) === "A VENCER 90 DIAS").length,
    ferias_total: (dash.ativos_total ?? 0) + detalhe.filter((x) => normStatus(x.status) === "VENCIDA").length,
  };

  return {
    ...dash,
    kpis,
    detalhe,
    limite_ferias_pivot: pivot,
    programacao_proximos_90_dias: prox90,
    primeiro_vencimento_sem_programacao: sem,
  };
}
