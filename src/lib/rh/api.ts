import { api } from "@/lib/api";
import type {
  MenuItemRh,
  ResumoFolhaItem,
  ResumoFolhaDashboard,
  ResumoFolhaKpis,
  QuadroColaboradorItem,
  ContratoExperienciaItem,
  ProgramacaoFeriasItem,
  FormularioRh,
  NovoFormularioPayload,
} from "./types";

export function toAnomes(v: string | undefined | null): string {
  if (!v) return "";
  const digits = String(v).replace(/\D/g, "");
  return digits.slice(0, 6);
}

const EMPTY_KPIS: ResumoFolhaKpis = {
  provento: 0, desconto: 0, total_liquido: 0, custo_total: 0,
  beneficios: 0, inss_total: 0, hora_extra: 0, provisoes: 0,
  custo_ferias: 0, rescisoes: 0, fgts: 0,
};

function num(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (/,\d{1,4}$/.test(s) && /\./.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/,\d{1,4}$/.test(s)) s = s.replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : 0;
}

function pickStr(o: any, keys: string[]): string | undefined {
  for (const k of keys) {
    if (o?.[k] != null && o[k] !== "") return String(o[k]);
  }
  return undefined;
}


// Aceita lista direta ou objeto com "dados"/"items"/"data"
function unwrap<T>(resp: any): T[] {
  if (Array.isArray(resp)) return resp as T[];
  if (Array.isArray(resp?.dados)) return resp.dados as T[];
  if (Array.isArray(resp?.items)) return resp.items as T[];
  if (Array.isArray(resp?.data)) return resp.data as T[];
  if (Array.isArray(resp?.resultados)) return resp.resultados as T[];
  return [];
}

function cleanParams<T extends Record<string, any>>(p?: T): Record<string, any> | undefined {
  if (!p) return undefined;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === "" || v === "__all__") continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function fetchMenuRh(): Promise<MenuItemRh[]> {
  const resp = await api.get<any>("/api/rh/menu");
  return unwrap<MenuItemRh>(resp);
}

export interface ResumoFolhaParams {
  anomes_ini: string;
  anomes_fim: string;
  filial?: string;
  matricula?: string;
}


// Converte string pt-BR ("1.234,56"), en-US ("1234.56") ou número para number.
function toNum(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (!s) return 0;
  // se tem vírgula como decimal pt-BR
  if (/,\d{1,4}$/.test(s) && /\./.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/,\d{1,4}$/.test(s)) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return isFinite(n) ? n : 0;
}

function pick<T = any>(raw: any, keys: string[]): T | undefined {
  for (const k of keys) {
    if (raw[k] !== undefined && raw[k] !== null && raw[k] !== "") return raw[k];
  }
  return undefined;
}

function normalizeCompetencia(v: any): string | undefined {
  if (v == null || v === "") return undefined;
  const s = String(v).replace(/[-/]/g, "");
  return s || undefined;
}

export function normalizeResumoFolhaItem(raw: any): ResumoFolhaItem {
  if (!raw || typeof raw !== "object") return raw;
  return {
    ...raw,
    competencia: normalizeCompetencia(pick(raw, ["competencia", "ano_mes", "anomes", "periodo"])),
    matricula: pick(raw, ["matricula", "cd_matricula", "num_matricula", "numcad"]),
    colaborador: pick(raw, ["colaborador", "nm_colaborador", "ds_colaborador", "nomfun", "nome"]),
    filial: pick(raw, ["filial", "ds_filial", "nm_filial", "cd_filial", "codfil"]),
    centro_custo: pick(raw, ["centro_custo", "cd_centro_custo", "ds_centro_custo", "codccu"]),
    evento: pick(raw, ["evento", "cd_evento", "codigo_evento", "codeve"]),
    descricao_evento: pick(raw, ["descricao_evento", "ds_evento", "descricao", "titeve"]),
    tipo_evento: pick(raw, ["tipo_evento", "tp_evento", "tipo", "tipeve"]),
    referencia: toNum(pick(raw, ["referencia", "vl_referencia", "qt_referencia", "qtd_referencia", "refeve"])),
    valor_evento: toNum(pick(raw, ["valor_evento", "vl_evento", "valor", "vl_total", "valeve"])),
    provento: toNum(pick(raw, ["provento", "vl_provento", "valor_provento", "vlprov"])),
    desconto: toNum(pick(raw, ["desconto", "vl_desconto", "valor_desconto", "vldesc"])),
    liquido_calculado: toNum(pick(raw, ["liquido_calculado", "vl_liquido", "liquido"])),
  };
}

export async function fetchResumoFolha(p: ResumoFolhaParams): Promise<ResumoFolhaItem[]> {
  const resp = await api.get<any>("/api/rh/resumo-folha", cleanParams(p));
  const brutos = unwrap<any>(resp);
  const itens = brutos.map(normalizeResumoFolhaItem);
  if (brutos.length > 0) {
    // eslint-disable-next-line no-console
    console.log("[RH ResumoFolha] amostra", {
      totalItens: brutos.length,
      chavesRaw: Object.keys(brutos[0] ?? {}),
      raw0: brutos[0],
      normalizado0: itens[0],
    });
  }
  return itens;
}

export class DashboardIndisponivelError extends Error {
  code = "DASHBOARD_INDISPONIVEL" as const;
  statusCode?: number;
  constructor(msg = "Endpoint de dashboard da folha ainda não disponível.", statusCode?: number) {
    super(msg);
    this.statusCode = statusCode;
  }
}

function normalizeEventos(arr: any): { codigo?: string; descricao?: string; valor: number }[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((r) => ({
    codigo: pickStr(r, ["codigo", "cd_evento", "evento", "codeve"]),
    descricao: pickStr(r, ["descricao", "ds_evento", "descricao_evento", "titeve"]) ?? "-",
    valor: num(r.valor ?? r.vl_total ?? r.total ?? r.provento ?? r.desconto),
  }));
}

function normalizeFiliais(arr: any) {
  if (!Array.isArray(arr)) return [];
  return arr.map((r) => ({
    filial: pickStr(r, ["filial", "ds_filial", "nm_filial", "cd_filial"]) ?? "-",
    salario_base: num(r.salario_base ?? r.salarioBase),
    custo_total: num(r.custo_total ?? r.custoTotal),
    qtd_horas: num(r.qtd_horas ?? r.qtdHoras),
    custo_hora_extra: num(r.custo_hora_extra ?? r.custoHE ?? r.custo_he),
    qtd_hora_extra: num(r.qtd_hora_extra ?? r.qtdHE ?? r.qtd_he),
    liquido: num(r.liquido),
    fgts: num(r.fgts),
    beneficios: num(r.beneficios ?? r.benef ?? r.va),
    inss: num(r.inss),
    custo_ferias: num(r.custo_ferias ?? r.ferias),
    provisoes: num(r.provisoes ?? r.provis),
  }));
}

function normalizeDashboard(raw: any): ResumoFolhaDashboard {
  const k = raw?.kpis ?? {};
  return {
    kpis: {
      provento: num(k.provento),
      desconto: num(k.desconto),
      total_liquido: num(k.total_liquido ?? k.liquido),
      custo_total: num(k.custo_total),
      beneficios: num(k.beneficios),
      inss_total: num(k.inss_total ?? k.inss),
      hora_extra: num(k.hora_extra),
      provisoes: num(k.provisoes),
      custo_ferias: num(k.custo_ferias),
      rescisoes: num(k.rescisoes),
      fgts: num(k.fgts),
    },
    proventos_vantagens: normalizeEventos(raw?.proventos_vantagens),
    descontos: normalizeEventos(raw?.descontos),
    filiais: normalizeFiliais(raw?.filiais),
    tipos_evento: Array.isArray(raw?.tipos_evento)
      ? raw.tipos_evento.map((t: any) => ({
          tipo: pickStr(t, ["tipo", "tp_evento", "tipo_evento"]) ?? "OUTROS",
          valor: num(t.valor ?? t.vl_total ?? t.total),
        }))
      : [],
    mensal: Array.isArray(raw?.mensal)
      ? raw.mensal.map((m: any) => ({
          competencia: String(m.competencia ?? m.ano_mes ?? m.anomes ?? ""),
          custo_hora_extra: num(m.custo_hora_extra ?? m.custoHE),
          custo_mensal: num(m.custo_mensal ?? m.custoMensal),
          provento: num(m.provento ?? m.vl_provento),
          desconto: num(m.desconto ?? m.vl_desconto),
          total_liquido: num(m.total_liquido ?? m.liquido ?? m.vl_liquido),
        }))
      : [],
  };
}

export type ResumoFolhaModo = "acumulado" | "mensal";

export async function fetchResumoFolhaDashboard(
  p: ResumoFolhaParams,
  modo: ResumoFolhaModo = "acumulado",
): Promise<ResumoFolhaDashboard> {
  const params = cleanParams({
    anomes_ini: toAnomes(p.anomes_ini),
    anomes_fim: toAnomes(p.anomes_fim),
    filial: p.filial,
    matricula: p.matricula,
    modo,
  });
  try {
    const resp = await api.get<any>("/api/rh/resumo-folha/dashboard", params);
    // eslint-disable-next-line no-console
    console.log("[RH ResumoFolha] dashboard", { modo, kpis: resp?.kpis, mensal: resp?.mensal?.length });
    return normalizeDashboard(resp ?? {});
  } catch (e: any) {
    const status = e?.statusCode ?? e?.status;
    if (status === 404 || status === 405 || status === 501) {
      throw new DashboardIndisponivelError(undefined, status);
    }
    throw e;
  }
}

export { EMPTY_KPIS };

// ============================================================
// Agregação client-side a partir das linhas de /api/rh/resumo-folha
// (fonte de verdade — bate com os totais oficiais da folha)
// ============================================================

import { classifyEvento } from "./eventoBuckets";

export interface ConsolidadoOptions {
  enriquecerComDashboard?: boolean;
}

export interface ResumoFolhaConsolidado extends ResumoFolhaDashboard {
  fonte: "linhas" | "misto";
  total_linhas: number;
}

function sumBy<T>(arr: T[], fn: (x: T) => number): number {
  let s = 0;
  for (const x of arr) s += fn(x) || 0;
  return s;
}

export function aggregateKpisFromLinhas(itens: ResumoFolhaItem[]): ResumoFolhaKpis {
  const provento = sumBy(itens, (r) => Number(r.provento ?? 0));
  const desconto = sumBy(itens, (r) => Number(r.desconto ?? 0));
  const total_liquido = provento - desconto;

  const sumBucket = (bucket: string, side: "P" | "D" | "ANY" = "ANY") =>
    sumBy(itens, (r) => {
      if (!classifyEvento(r).includes(bucket as any)) return 0;
      if (side === "P") return Number(r.provento ?? 0);
      if (side === "D") return Number(r.desconto ?? 0);
      return Number(r.provento ?? 0) + Number(r.desconto ?? 0);
    });

  const inss_total = sumBucket("INSS", "D");
  const hora_extra = sumBucket("HORA_EXTRA", "P");
  const custo_ferias = sumBucket("FERIAS", "P");
  const fgts = sumBucket("FGTS");
  const beneficios = sumBucket("BENEFICIOS");
  const rescisoes = sumBucket("RESCISAO");
  const provisoes = sumBucket("PROVISOES");
  const custo_total = provento + fgts + provisoes;

  return {
    provento, desconto, total_liquido, custo_total,
    beneficios, inss_total, hora_extra, provisoes,
    custo_ferias, rescisoes, fgts,
  };
}

function topEventos(
  itens: ResumoFolhaItem[],
  side: "P" | "D",
  limit = 50,
): { codigo?: string; descricao?: string; valor: number }[] {
  const map = new Map<string, { codigo?: string; descricao?: string; valor: number }>();
  for (const r of itens) {
    const v = side === "P" ? Number(r.provento ?? 0) : Number(r.desconto ?? 0);
    if (!v) continue;
    const key = `${r.evento ?? ""}|${r.descricao_evento ?? "-"}`;
    const ex = map.get(key);
    if (ex) ex.valor += v;
    else map.set(key, {
      codigo: r.evento != null ? String(r.evento) : undefined,
      descricao: r.descricao_evento ?? "-",
      valor: v,
    });
  }
  return [...map.values()].sort((a, b) => b.valor - a.valor).slice(0, limit);
}

export const buildProventosFromLinhas = (itens: ResumoFolhaItem[]) => topEventos(itens, "P");
export const buildDescontosFromLinhas = (itens: ResumoFolhaItem[]) => topEventos(itens, "D");

export function buildTiposEventoFromLinhas(itens: ResumoFolhaItem[]) {
  const buckets: Record<string, number> = {};
  for (const r of itens) {
    const tags = classifyEvento(r);
    const v = Number(r.provento ?? 0) + Number(r.desconto ?? 0);
    if (!tags.length) { buckets["OUTROS"] = (buckets["OUTROS"] ?? 0) + v; continue; }
    for (const t of tags) buckets[t] = (buckets[t] ?? 0) + v;
  }
  return Object.entries(buckets).map(([tipo, valor]) => ({ tipo, valor })).sort((a, b) => b.valor - a.valor);
}

export function buildFiliaisFromLinhas(itens: ResumoFolhaItem[]) {
  const groups = new Map<string, ResumoFolhaItem[]>();
  for (const r of itens) {
    const k = r.filial ?? "-";
    const arr = groups.get(k) ?? [];
    arr.push(r);
    groups.set(k, arr);
  }
  return [...groups.entries()].map(([filial, rows]) => {
    const k = aggregateKpisFromLinhas(rows);
    return {
      filial,
      salario_base: 0,
      custo_total: k.custo_total,
      qtd_horas: 0,
      custo_hora_extra: k.hora_extra,
      qtd_hora_extra: 0,
      liquido: k.total_liquido,
      fgts: k.fgts,
      beneficios: k.beneficios,
      inss: k.inss_total,
      custo_ferias: k.custo_ferias,
      provisoes: k.provisoes,
    };
  }).sort((a, b) => (b.custo_total ?? 0) - (a.custo_total ?? 0));
}

export function buildMensalFromLinhas(itens: ResumoFolhaItem[]) {
  const map = new Map<string, { competencia: string; custo_hora_extra: number; custo_mensal: number }>();
  for (const r of itens) {
    const c = String(r.competencia ?? "").replace(/\D/g, "").slice(0, 6);
    if (!c) continue;
    const ex = map.get(c) ?? { competencia: c, custo_hora_extra: 0, custo_mensal: 0 };
    const isHE = classifyEvento(r).includes("HORA_EXTRA");
    const p = Number(r.provento ?? 0);
    if (isHE) ex.custo_hora_extra += p;
    ex.custo_mensal += p;
    map.set(c, ex);
  }
  return [...map.values()].sort((a, b) => a.competencia.localeCompare(b.competencia));
}

/**
 * Fonte principal: /api/rh/resumo-folha (linhas) — bate com os totais oficiais.
 * Best-effort: enriquece com /dashboard (mensal/filiais oficiais) sem quebrar em falha.
 */
export async function fetchResumoFolhaConsolidado(
  p: ResumoFolhaParams,
  opts: ConsolidadoOptions = {},
): Promise<ResumoFolhaConsolidado> {
  const enriquecer = opts.enriquecerComDashboard ?? true;

  const linhasPromise = fetchResumoFolha({
    anomes_ini: toAnomes(p.anomes_ini),
    anomes_fim: toAnomes(p.anomes_fim),
    filial: p.filial,
    matricula: p.matricula,
  });

  const dashPromise: Promise<ResumoFolhaDashboard | null> = enriquecer
    ? fetchResumoFolhaDashboard(p).catch(() => null)
    : Promise.resolve(null);

  const [itens, dash] = await Promise.all([linhasPromise, dashPromise]);

  const kpis = aggregateKpisFromLinhas(itens);
  const proventos_vantagens = buildProventosFromLinhas(itens);
  const descontos = buildDescontosFromLinhas(itens);
  const tipos_evento = buildTiposEventoFromLinhas(itens);
  const filiais = (dash?.filiais && dash.filiais.length > 0) ? dash.filiais : buildFiliaisFromLinhas(itens);
  const mensal = (dash?.mensal && dash.mensal.length > 0) ? dash.mensal : buildMensalFromLinhas(itens);

  // eslint-disable-next-line no-console
  console.log("[RH ResumoFolha] consolidado", {
    fonte: dash ? "misto" : "linhas",
    total_linhas: itens.length,
    kpis,
  });

  return {
    fonte: dash ? "misto" : "linhas",
    total_linhas: itens.length,
    kpis,
    proventos_vantagens,
    descontos,
    filiais,
    tipos_evento,
    mensal,
  };
}




export interface QuadroColaboradoresParams {
  filial?: string;
  situacao?: string;
  centro_custo?: string;
  cargo?: string;
  colaborador?: string;
}
export async function fetchQuadroColaboradores(p?: QuadroColaboradoresParams): Promise<QuadroColaboradorItem[]> {
  const resp = await api.get<any>("/api/rh/quadro-colaboradores", cleanParams(p));
  return unwrap<QuadroColaboradorItem>(resp);
}

export interface ContratoExperienciaParams {
  status?: string;
  filial?: string;
  colaborador?: string;
}
export async function fetchContratoExperiencia(p?: ContratoExperienciaParams): Promise<ContratoExperienciaItem[]> {
  const resp = await api.get<any>("/api/rh/contrato-experiencia", cleanParams(p));
  return unwrap<ContratoExperienciaItem>(resp);
}

export interface ProgramacaoFeriasParams {
  status?: string;
  filial?: string;
  centro_custo?: string;
  colaborador?: string;
}
export async function fetchProgramacaoFerias(p?: ProgramacaoFeriasParams): Promise<ProgramacaoFeriasItem[]> {
  const resp = await api.get<any>("/api/rh/programacao-ferias", cleanParams(p));
  return unwrap<ProgramacaoFeriasItem>(resp);
}

export async function fetchFormularios(): Promise<FormularioRh[]> {
  const resp = await api.get<any>("/api/rh/formularios");
  return unwrap<FormularioRh>(resp);
}

export async function criarFormulario(payload: NovoFormularioPayload): Promise<FormularioRh> {
  return api.post<FormularioRh>("/api/rh/formularios", payload as any);
}

export async function atualizarStatusFormulario(id: number | string, cd_status: string): Promise<FormularioRh> {
  // Tenta PUT primeiro (api.put existe); backend pode aceitar PATCH equivalente.
  try {
    return await api.put<FormularioRh>(`/api/rh/formularios/${id}`, { cd_status });
  } catch (e) {
    // Fallback: POST no mesmo recurso com id + status (idempotente)
    return api.post<FormularioRh>(`/api/rh/formularios/${id}`, { cd_status });
  }
}

export interface SincronizarRhParams {
  anomes_ini: string;
  anomes_fim: string;
  codemp?: number;
}
export async function sincronizarRh(p: SincronizarRhParams): Promise<any> {
  const qs = new URLSearchParams({
    anomes_ini: p.anomes_ini,
    anomes_fim: p.anomes_fim,
    codemp: String(p.codemp ?? 1),
  }).toString();
  return api.post<any>(`/api/rh/sync?${qs}`);
}
