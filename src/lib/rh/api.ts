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

function normalizeEventos(arr: any): { codigo?: string; cd_evento?: string; descricao?: string; ds_evento?: string; valor: number }[] {
  if (!Array.isArray(arr)) return [];
  const items = arr.map((r) => {
    const cd = pickStr(r, ["cd_evento", "codigo", "evento", "codeve"]);
    const ds = pickStr(r, ["ds_evento", "descricao", "descricao_evento", "titeve"]) ?? "-";
    return {
      cd_evento: cd,
      codigo: cd,
      ds_evento: ds,
      descricao: ds,
      valor: num(r.valor ?? r.vl_total ?? r.total ?? r.provento ?? r.desconto),
    };
  });
  items.sort((a, b) => (b.valor || 0) - (a.valor || 0));
  return items;
}


function numOrUndef(v: any): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  return num(v);
}

function pickKey(obj: any, keys: string[]): { hit: boolean; value: any } {
  if (!obj || typeof obj !== "object") return { hit: false, value: undefined };
  for (const k of keys) {
    if (k in obj) return { hit: true, value: obj[k] };
  }
  return { hit: false, value: undefined };
}

function normalizeFiliais(arr: any) {
  if (!Array.isArray(arr)) return [];
  return arr.map((r) => {
    const out: any = {
      filial: pickStr(r, ["filial", "ds_filial", "nm_filial", "cd_filial"]) ?? "-",
    };
    const mapKeys: Record<string, string[]> = {
      salario_base: ["salario_base", "salarioBase"],
      custo_total: ["custo_total", "custoTotal"],
      qtd_horas: ["qtd_horas", "qtdHoras"],
      custo_hora_extra: ["custo_hora_extra", "custoHE", "custo_he"],
      qtd_hora_extra: ["qtd_hora_extra", "qtdHE", "qtd_he"],
      liquido: ["liquido"],
      fgts: ["fgts"],
      va: ["va", "beneficios", "benef"],
      beneficios: ["beneficios", "va"],
      inss: ["inss"],
      custo_ferias: ["custo_ferias", "ferias"],
      prov_ferias: ["prov_ferias", "provFerias"],
      prov_13: ["prov_13", "prov13", "provisao_13"],
      proventos: ["proventos"],
      descontos: ["descontos"],
      provisoes: ["provisoes", "provis"],
    };
    for (const [field, aliases] of Object.entries(mapKeys)) {
      const { hit, value } = pickKey(r, aliases);
      if (hit) out[field] = numOrUndef(value);
    }
    return out;
  });
}

const KPI_ALIASES: Record<keyof ResumoFolhaKpis, string[]> = {
  provento: ["provento"],
  desconto: ["desconto"],
  total_liquido: ["total_liquido", "liquido"],
  custo_total: ["custo_total"],
  beneficios: ["beneficios"],
  inss_total: ["inss_total", "inss"],
  hora_extra: ["hora_extra"],
  provisoes: ["provisoes"],
  custo_ferias: ["custo_ferias"],
  rescisoes: ["rescisoes"],
  fgts: ["fgts"],
};

function buildKpis(k: any): { kpis: ResumoFolhaKpis; missing: string[] } {
  const kpis = { ...EMPTY_KPIS };
  const missing: string[] = [];
  for (const [field, aliases] of Object.entries(KPI_ALIASES) as [keyof ResumoFolhaKpis, string[]][]) {
    const { hit, value } = pickKey(k ?? {}, aliases);
    if (hit && value !== null && value !== "") {
      (kpis as any)[field] = num(value);
    } else {
      missing.push(field);
    }
  }
  return { kpis, missing };
}

function normalizeDashboard(raw: any): ResumoFolhaDashboard {
  const { kpis, missing } = buildKpis(raw?.kpis);
  return {
    kpis,
    _missing_kpis: missing,
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
  p: ResumoFolhaParams & { codemp?: number },
  _modo?: ResumoFolhaModo,
): Promise<ResumoFolhaDashboard> {
  const params = cleanParams({
    anomes_ini: toAnomes(p.anomes_ini),
    anomes_fim: toAnomes(p.anomes_fim),
    codemp: p.codemp ?? 1,
    filial: p.filial,
    matricula: p.matricula,
  });
  try {
    const resp = await api.get<any>("/api/rh/resumo-folha/dashboard", params);
    // eslint-disable-next-line no-console
    console.log("[RH ResumoFolha] dashboard", { params, kpis: resp?.kpis, filiais: resp?.filiais?.length });
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
