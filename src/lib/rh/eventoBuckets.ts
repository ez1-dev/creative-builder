import type { ResumoFolhaItem } from "./types";

export type EventoBucket =
  | "HORA_EXTRA"
  | "FERIAS"
  | "RESCISAO"
  | "INSS"
  | "FGTS"
  | "BENEFICIOS"
  | "PROVISOES"
  | "HORAS_NORMAIS";

const RE_HORA_EXTRA = /(HORA[S]?\s*EXTRA|H\.?\s*EXTRA|HRS?\s*EXTRA)/i;
const RE_FERIAS = /(F[ÉE]RIAS|1\/3)/i;
const RE_RESCISAO = /(AVISO|RESCIS|IND\.?\s*T[EÉ]RM)/i;
const RE_INSS = /\bINSS\b/i;
const RE_FGTS = /\bFGTS\b/i;
const RE_BENEF = /(\bVR\b|\bVT\b|VALE|PLANO|PLR|\bAUX|BENEF)/i;
const RE_PROVIS = /PROVIS/i;
const RE_HRS_NORMAIS = /HORAS?\s*NORMAIS/i;

/**
 * Classifica uma linha de folha em zero ou mais "baldes" lógicos.
 * Buckets são heurísticos — ajuste os regexes acima caso a folha use outras descrições.
 */
export function classifyEvento(r: ResumoFolhaItem): EventoBucket[] {
  const txt = `${r.descricao_evento ?? ""} ${r.evento ?? ""} ${r.tipo_evento ?? ""}`;
  const out: EventoBucket[] = [];
  if (RE_HORA_EXTRA.test(txt)) out.push("HORA_EXTRA");
  if (RE_FERIAS.test(txt)) out.push("FERIAS");
  if (RE_RESCISAO.test(txt)) out.push("RESCISAO");
  if (RE_INSS.test(txt)) out.push("INSS");
  if (RE_FGTS.test(txt)) out.push("FGTS");
  if (RE_BENEF.test(txt)) out.push("BENEFICIOS");
  if (RE_PROVIS.test(txt)) out.push("PROVISOES");
  if (RE_HRS_NORMAIS.test(txt)) out.push("HORAS_NORMAIS");
  return out;
}

export function valorLinha(r: ResumoFolhaItem): number {
  return Number(r.valor_evento ?? 0) || (Number(r.provento ?? 0) + Number(r.desconto ?? 0));
}

/** Soma valores de linhas que se enquadram em um bucket. */
export function somarBucket(rows: ResumoFolhaItem[], bucket: EventoBucket): number {
  return rows.reduce((acc, r) => {
    if (classifyEvento(r).includes(bucket)) acc += valorLinha(r);
    return acc;
  }, 0);
}

/** Agrupa linhas por uma chave e aplica uma função reduce. */
export function groupBy<T, K extends string>(rows: T[], key: (r: T) => K | undefined): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    (out[k] ||= []).push(r);
  }
  return out;
}

/** Formata um total em horas decimais ou minutos em "HHHH:MM". */
export function formatHorasMin(value: number | null | undefined): string {
  if (value == null || !isFinite(Number(value))) return "0:00";
  const v = Number(value);
  // heurística: valores > 10000 provavelmente são em minutos
  const totalMin = v > 10000 ? Math.round(v) : Math.round(v * 60);
  const h = Math.floor(totalMin / 60);
  const m = Math.abs(totalMin % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** Ordena chaves de competência YYYYMM ou YYYY-MM. */
export function sortCompetencias(items: string[]): string[] {
  return [...items].sort();
}

/** Formata YYYYMM ou YYYY-MM em "MMM/YYYY" pt-BR. */
const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
export function formatCompetencia(c: string): string {
  if (!c) return "";
  const clean = c.replace("-", "").replace("/", "");
  if (clean.length < 6) return c;
  const y = clean.slice(0, 4);
  const m = Number(clean.slice(4, 6));
  return `${MESES[m - 1] ?? m}/${y}`;
}
