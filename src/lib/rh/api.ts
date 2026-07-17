import { api, getApiUrl } from "@/lib/api";
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

const EMPTY_KPIS: ResumoFolhaKpis = {};

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

const HORAS_FIELDS = new Set(["qtd_horas", "qtd_hora_extra"]);

function normalizeFiliais(arr: any) {
  if (!Array.isArray(arr)) return [];
  return arr.map((r) => {
    const out: any = {
      cd_filial: pickStr(r, ["cd_filial", "codfil"]),
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
      va: ["va"],
      beneficios: ["beneficios"],
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
      if (!hit) continue;
      // qtd_horas / qtd_hora_extra: preservar exatamente como veio da API (texto).
      if (HORAS_FIELDS.has(field)) {
        out[field] = value == null ? value : String(value);
      } else {
        out[field] = numOrUndef(value);
      }
    }
    return out;
  });
}



const KPI_ALIASES: Record<string, string[]> = {
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
  salario_base: ["salario_base", "salarioBase"],
  salario_bruto: ["salario_bruto", "salarioBruto"],
  va: ["va"],
  outras_gratificacoes: ["outras_gratificacoes", "outrasGratificacoes"],
};

function buildKpis(k: any): { kpis: ResumoFolhaKpis; missing: string[] } {
  const kpis: ResumoFolhaKpis = {};
  const missing: string[] = [];
  for (const [field, aliases] of Object.entries(KPI_ALIASES)) {
    const { hit, value } = pickKey(k ?? {}, aliases);
    const pendenteStr =
      typeof value === "string" && value.trim().toLowerCase() === "campo_pendente";
    if (!hit) {
      // Campo totalmente ausente do payload → marca como missing (aviso técnico).
      missing.push(field);
    } else if (value === null || value === "" || pendenteStr) {
      // Campo presente mas oficialmente nulo/pendente → NÃO é "missing" técnico,
      // é um estado válido da API. Guarda null para o componente exibir badge "Pendente".
      (kpis as any)[field] = null;
    } else {
      (kpis as any)[field] = num(value);
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
      ? raw.tipos_evento.map((t: any) => {
          const cd = pickStr(t, ["cd_tp_evento", "tp_evento", "tipo_evento", "tipo"]);
          return {
            cd_tp_evento: cd,
            tipo: pickStr(t, ["tipo", "cd_tp_evento", "tp_evento", "tipo_evento"]) ?? cd ?? "OUTROS",
            valor: num(t.valor ?? t.vl_total ?? t.total),
          };
        })
      : [],
    mensal: Array.isArray(raw?.mensal)
      ? raw.mensal.map((m: any) => ({
          competencia: String(m.anomes_competencia ?? m.competencia ?? m.ano_mes ?? m.anomes ?? ""),
          custo_hora_extra: num(m.custo_hora_extra ?? m.custoHE),
          custo_mensal: num(m.custo_mensal ?? m.custoMensal),
          provento: num(m.provento ?? m.vl_provento),
          desconto: num(m.desconto ?? m.vl_desconto),
          total_liquido: num(m.total_liquido ?? m.liquido ?? m.vl_liquido),
        }))
      : [],
    fonte: raw?.fonte,
    debug: raw?.debug,
    diagnostico: raw?.diagnostico,
    kpis_status: raw?.kpis_status ?? null,
    kpis_completude: raw?.kpis_completude ?? null,
    drills_menu: Array.isArray(raw?.drills_menu)
      ? raw.drills_menu
          .map((d: any) => ({
            card: String(d?.card ?? "").trim(),
            label: String(d?.label ?? d?.card ?? "").trim(),
            agrupamentos: Array.isArray(d?.agrupamentos)
              ? d.agrupamentos
                  .map((a: any) => ({
                    key: String(a?.key ?? a?.agrupar_por ?? a?.id ?? "").trim(),
                    label: String(a?.label ?? a?.nome ?? a?.key ?? "").trim(),
                    ...a,
                  }))
                  .filter((a: any) => a.key)
              : [],
            ...d,
          }))
          .filter((d: any) => d.card)
      : [],
  };
}


export type ResumoFolhaModo = "completo" | "acumulado" | "mensal";

export async function fetchResumoFolhaDashboard(
  p: ResumoFolhaParams & { codemp?: number },
  modo: ResumoFolhaModo = "completo",
): Promise<ResumoFolhaDashboard> {
  const params = cleanParams({
    anomes_ini: toAnomes(p.anomes_ini),
    anomes_fim: toAnomes(p.anomes_fim),
    codemp: p.codemp ?? 1,
    filial: p.filial,
    matricula: p.matricula,
    modo,
  });

  try {
    const resp = await api.get<any>("/api/rh/resumo-folha/dashboard", params);
    const normalizado = normalizeDashboard(resp ?? {});
    // eslint-disable-next-line no-console
    console.log("[RH ResumoFolha] dashboard", {
      params,
      kpis_raw: resp?.kpis,
      kpis_normalizados: normalizado.kpis,
      _missing_kpis: normalizado._missing_kpis,
      drills_menu: normalizado.drills_menu,
      filiais: resp?.filiais?.length,
      mensal: resp?.mensal?.length,
    });

    return normalizado;

  } catch (e: any) {
    const status = e?.statusCode ?? e?.status;
    if (status === 404 || status === 405 || status === 501) {
      throw new DashboardIndisponivelError(undefined, status);
    }
    throw e;
  }
}


export { EMPTY_KPIS };

// ============= Drill do Resumo da Folha =============

export interface ResumoFolhaDrillParams {
  card: string;
  agrupar_por: string;
  anomes_ini: string; // YYYYMM
  anomes_fim: string; // YYYYMM
  cd_filial?: string;
}

export class ResumoFolhaDrillError extends Error {
  status: number;
  detail: any;
  constructor(msg: string, status: number, detail: any) {
    super(msg);
    this.name = "ResumoFolhaDrillError";
    this.status = status;
    this.detail = detail;
  }
}

export async function fetchResumoFolhaDrill(
  p: ResumoFolhaDrillParams,
): Promise<import("./types").ResumoFolhaDrillResponse> {
  const params = cleanParams({
    card: p.card,
    agrupar_por: p.agrupar_por,
    anomes_ini: p.anomes_ini,
    anomes_fim: p.anomes_fim,
    cd_filial: p.cd_filial,
  });
  try {
    const resp = await api.get<any>("/api/rh/resumo-folha/drill", params);
    const itens = Array.isArray(resp?.itens)
      ? resp.itens.map((it: any) => ({
          label: String(it?.label ?? it?.nome ?? it?.descricao ?? ""),
          valor: it?.valor == null ? null : Number(it.valor),
          qtd: it?.qtd == null ? null : Number(it.qtd),
          ...it,
        }))
      : [];
    const normalizado = {
      card: String(resp?.card ?? p.card),
      agrupar_por: String(resp?.agrupar_por ?? p.agrupar_por),
      itens,
      total: resp?.total == null ? null : Number(resp.total),
      fonte: resp?.fonte ?? null,
      meta: resp?.meta ?? null,
      ...resp,
    };
    // eslint-disable-next-line no-console
    console.log("[RH ResumoFolha] drill", { params, resp: normalizado });
    return normalizado;
  } catch (e: any) {
    const status = e?.statusCode ?? e?.status ?? 0;
    if (status === 422) {
      const detail = e?.details?.detail ?? e?.details ?? e?.message;
      throw new ResumoFolhaDrillError(
        typeof detail === "string" ? detail : (e?.message || "Requisição inválida (422)."),
        422,
        detail,
      );
    }
    throw e;
  }
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

export async function fetchContratoExperienciaDashboard(
  codemp: number = 1,
  diasVencidoMax: number = 90,
): Promise<import("./types").ContratoExperienciaDashboard> {
  const resp = await api.get<any>(
    "/api/rh/contrato-experiencia/dashboard",
    cleanParams({ codemp, dias_vencido_max: diasVencidoMax }),
  );
  const k = resp?.kpis ?? {};
  const numOrNull = (v: any): number | null =>
    v === null || v === undefined || v === "" ? null : Number(v);
  const venc = Array.isArray(resp?.vencimentos) ? resp.vencimentos : [];
  return {
    kpis: {
      qtde_contratos: num(k.qtde_contratos),
      vencidos_pendentes: num(k.vencidos_pendentes),
      demitidos_30_apos_exp: num(k.demitidos_30_apos_exp),
      a_vencer_5_dias: num(k.a_vencer_5_dias),
      a_vencer_10_dias: num(k.a_vencer_10_dias),
    },
    vencimentos: venc.map((v: any) => ({
      empresa: v.empresa ?? "",
      filial: v.filial ?? "",
      cargo: v.cargo ?? "",
      matricula: String(v.matricula ?? ""),
      colaborador: v.colaborador ?? "",
      dt_admissao: v.dt_admissao ?? "",
      dt_primeiro_vencimento: v.dt_primeiro_vencimento ?? v.dt_vencimento ?? "",
      dt_segundo_vencimento: v.dt_segundo_vencimento ?? v.dt_vencimento ?? "",
      dt_vencimento: v.dt_vencimento ?? v.dt_primeiro_vencimento ?? "",
      dias_restantes: numOrNull(v.dias_restantes),
      dias_vencido: numOrNull(v.dias_vencido),
      status: v.status ?? "",
    })),
  };
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

export async function fetchProgramacaoFeriasDashboard(
  codemp: number = 1,
): Promise<import("./types").ProgramacaoFeriasDashboard> {
  const resp = await api.get<any>(
    "/api/rh/programacao-ferias/dashboard",
    cleanParams({ codemp }),
  );
  const k = resp?.kpis ?? {};
  const pivot = Array.isArray(resp?.limite_ferias_pivot) ? resp.limite_ferias_pivot : [];
  const pivotNorm = pivot
    .map((r: any) => ({
      ano: String(r?.ano ?? ""),
      m1: num(r?.m1), m2: num(r?.m2), m3: num(r?.m3), m4: num(r?.m4),
      m5: num(r?.m5), m6: num(r?.m6), m7: num(r?.m7), m8: num(r?.m8),
      m9: num(r?.m9), m10: num(r?.m10), m11: num(r?.m11), m12: num(r?.m12),
      total: num(r?.total),
    }))
    .sort((a: any, b: any) => (a.ano || "").localeCompare(b.ano || ""));
  const sem = Array.isArray(resp?.primeiro_vencimento_sem_programacao)
    ? [...resp.primeiro_vencimento_sem_programacao].sort((a: any, b: any) =>
        (a?.dt_limite_saida || "").localeCompare(b?.dt_limite_saida || ""),
      )
    : [];
  return {
    kpis: {
      ferias_vencidas: num(k.ferias_vencidas),
      a_vencer_30: num(k.a_vencer_30),
      a_vencer_60: num(k.a_vencer_60),
      a_vencer_90: num(k.a_vencer_90),
      ferias_total: num(k.ferias_total),
      de_ferias: num(k.de_ferias),
    },
    ativos_total: num(resp?.ativos_total),
    ferias_vencidas_diagnostico: resp?.ferias_vencidas_diagnostico,
    limite_ferias_pivot: pivotNorm,
    programacao_proximos_90_dias: Array.isArray(resp?.programacao_proximos_90_dias)
      ? resp.programacao_proximos_90_dias
      : [],
    primeiro_vencimento_sem_programacao: sem,
    detalhe: Array.isArray(resp?.detalhe) ? resp.detalhe : [],
    de_ferias_detalhe: Array.isArray(resp?.de_ferias_detalhe) ? resp.de_ferias_detalhe : [],
  };
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
// Timeout de 10 minutos para sincronizações longas (evita AbortError
// prematuro do fetch/proxy quando o backend processa por vários minutos).
const RH_SYNC_TIMEOUT_MS = 10 * 60_000;

export async function sincronizarRh(p: SincronizarRhParams): Promise<any> {
  const qs = new URLSearchParams({
    anomes_ini: p.anomes_ini,
    anomes_fim: p.anomes_fim,
    codemp: String(p.codemp ?? 1),
  }).toString();
  return api.post<any>(`/api/rh/sync?${qs}`, undefined, { timeoutMs: RH_SYNC_TIMEOUT_MS });
}

/**
 * @deprecated Endpoint legado que ainda tenta ler `VETORH.dbo.VM_FOLHA` (objeto inexistente).
 * Não usar mais na UI. Mantido apenas para referência histórica.
 */
export async function sincronizarVmFolha(p: SincronizarRhParams): Promise<any> {
  const qs = new URLSearchParams({
    codemp: String(p.codemp ?? 1),
    anomes_ini: toAnomes(p.anomes_ini),
    anomes_fim: toAnomes(p.anomes_fim),
  }).toString();
  return api.post<any>(`/api/rh/vm-folha/sincronizar?${qs}`, undefined, { timeoutMs: RH_SYNC_TIMEOUT_MS });
}


export class SincronizacaoCompatIndisponivelError extends Error {
  code = "SINCRONIZACAO_COMPAT_INDISPONIVEL" as const;
  constructor(msg = "Sincronização compatível ainda não implementada na API.") {
    super(msg);
  }
}

/**
 * Sincroniza o Resumo Folha via camada compatível da API.
 * Ordem: `/api/rh/vm-folha-compat/sincronizar` → fallback `/api/rh/resumo-folha/sincronizar`.
 * NÃO cai mais para `/api/rh/vm-folha/sincronizar` (endpoint legado que tenta VM_FOLHA física).
 * Se ambos retornarem 404/405, lança `SincronizacaoCompatIndisponivelError`.
 */
export async function sincronizarResumoFolha(p: SincronizarRhParams): Promise<any> {
  const qs = new URLSearchParams({
    codemp: String(p.codemp ?? 1),
    anomes_ini: toAnomes(p.anomes_ini),
    anomes_fim: toAnomes(p.anomes_fim),
  }).toString();
  const endpoints = [
    `/api/rh/vm-folha-compat/sincronizar?${qs}`,
    `/api/rh/resumo-folha/sincronizar?${qs}`,
  ];
  let lastErr: any;
  for (const url of endpoints) {
    try {
      return await api.post<any>(url);
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      lastErr = e;
      if (status === 404 || status === 405) continue;
      throw e;
    }
  }
  const st = lastErr?.statusCode ?? lastErr?.status;
  if (st === 404 || st === 405) throw new SincronizacaoCompatIndisponivelError();
  throw lastErr;
}


export interface StatusSincronizacaoRh {
  status?: string;
  job_id?: string;
  progresso?: number;
  mensagem?: string;
  diagnostico?: any;
  [k: string]: any;
}

/**
 * Baixa o Excel de conferência do RH-03 (Contrato Experiência).
 * GET /api/rh/contrato-experiencia/exportar?codemp=... com Bearer via header.
 */
export async function exportarContratoExperienciaExcel(
  codemp: number | string = 1,
  diasVencidoMax: number = 90,
): Promise<{ blob: Blob; filename: string }> {
  const codempStr = String(codemp ?? 1);
  const qs = new URLSearchParams({
    codemp: codempStr,
    dias_vencido_max: String(diasVencidoMax),
  });
  const token = api.getToken();
  if (token) qs.set("access_token", token);
  const url = `${getApiUrl()}/api/rh/contrato-experiencia/exportar?${qs.toString()}`;
  const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" };

  let resp: Response;
  try {
    resp = await fetch(url, { headers });
  } catch (e: any) {
    const err: any = new Error(e?.message || "Falha de rede ao exportar");
    err.code = "ERRO_GENERICO";
    throw err;
  }

  if (!resp.ok) {
    const err: any = new Error(
      resp.status === 401
        ? "Sessão expirada."
        : resp.status === 404 || resp.status === 405 || resp.status === 501
        ? "Exportação ainda não disponível no backend."
        : `Falha ao exportar (HTTP ${resp.status})`,
    );
    err.statusCode = resp.status;
    if (resp.status === 404 || resp.status === 405 || resp.status === 501) {
      err.code = "ENDPOINT_INDISPONIVEL";
    }
    throw err;
  }

  const blob = await resp.blob();
  const disposition = resp.headers.get("Content-Disposition");
  let filename = `rh_03_contrato_experiencia.xlsx`;
  if (disposition) {
    const m = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
    if (m?.[1]) filename = decodeURIComponent(m[1].replace(/"/g, ""));
  }
  return { blob, filename };
}

/**
 * Consulta o status atual de uma sincronização RH em andamento.
 * Se o backend ainda não expuser o endpoint (404), devolve `null`
 * para o chamador desligar o polling silenciosamente.
 */
export async function consultarStatusSincronizacaoRh(
  p: { codemp?: number; job_id?: string } = {},
): Promise<StatusSincronizacaoRh | null> {
  const params: Record<string, string> = { codemp: String(p.codemp ?? 1) };
  if (p.job_id) params.job_id = p.job_id;
  const qs = new URLSearchParams(params).toString();
  try {
    return await api.get<StatusSincronizacaoRh>(
      `/api/rh/vm-folha-compat/sincronizar/status?${qs}`,
    );
  } catch (e: any) {
    const status = e?.statusCode ?? e?.status;
    if (status === 404 || status === 405) return null;
    throw e;
  }
}

export class ExportarResumoFolhaError extends Error {
  code: "SESSAO_EXPIRADA" | "ENDPOINT_INDISPONIVEL" | "PERIODO_INVALIDO" | "ERRO_GENERICO";
  statusCode?: number;
  constructor(code: ExportarResumoFolhaError["code"], msg: string, statusCode?: number) {
    super(msg);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface ExportarResumoFolhaParams {
  anomes_ini: string;
  anomes_fim: string;
  codemp?: number;
  cd_filial?: string;
}

/**
 * Baixa o Excel de conferência da tela Resumo Folha.
 * Reaproveita os mesmos filtros do dashboard. Autentica via header Bearer (sem
 * expor token na URL/histórico do navegador).
 */
export async function exportarResumoFolhaExcel(
  p: ExportarResumoFolhaParams,
): Promise<{ blob: Blob; filename: string }> {
  const anomes_ini = toAnomes(p.anomes_ini);
  const anomes_fim = toAnomes(p.anomes_fim);
  const codemp = String(p.codemp ?? 1);
  const qs = new URLSearchParams({ anomes_ini, anomes_fim, codemp });
  if (p.cd_filial) qs.set("cd_filial", p.cd_filial);

  const url = `${getApiUrl()}/api/rh/resumo-folha/exportar?${qs.toString()}`;
  const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" };
  const token = api.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let resp: Response;
  try {
    resp = await fetch(url, { headers });
  } catch (e: any) {
    throw new ExportarResumoFolhaError(
      "ERRO_GENERICO",
      e?.message || "Falha de rede ao exportar",
    );
  }

  if (resp.status === 401) {
    throw new ExportarResumoFolhaError("SESSAO_EXPIRADA", "Sessão expirada.", 401);
  }
  if (resp.status === 404 || resp.status === 405 || resp.status === 501) {
    throw new ExportarResumoFolhaError(
      "ENDPOINT_INDISPONIVEL",
      "Exportação ainda não disponível no backend.",
      resp.status,
    );
  }
  if (resp.status === 422) {
    throw new ExportarResumoFolhaError(
      "PERIODO_INVALIDO",
      "Período inválido para exportação.",
      422,
    );
  }
  if (!resp.ok) {
    throw new ExportarResumoFolhaError(
      "ERRO_GENERICO",
      `Falha ao exportar (HTTP ${resp.status})`,
      resp.status,
    );
  }

  const blob = await resp.blob();
  const disposition = resp.headers.get("Content-Disposition");
  let filename = `resumo_folha_${codemp}_${anomes_ini}_${anomes_fim}.xlsx`;
  if (disposition) {
    const m = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
    if (m?.[1]) filename = decodeURIComponent(m[1].replace(/"/g, ""));
  }
  return { blob, filename };
}

/**
 * Baixa o Excel de conferência do RH-04 (Programação de Férias).
 * GET /api/rh/programacao-ferias/exportar?codemp=... com Bearer via header.
 */
export async function exportarProgramacaoFeriasExcel(
  codemp: number | string = 1,
): Promise<{ blob: Blob; filename: string }> {
  const codempStr = String(codemp ?? 1);
  const qs = new URLSearchParams({ codemp: codempStr });
  const url = `${getApiUrl()}/api/rh/programacao-ferias/exportar?${qs.toString()}`;
  const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" };
  const token = api.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let resp: Response;
  try {
    resp = await fetch(url, { headers });
  } catch (e: any) {
    const err: any = new Error(e?.message || "Falha de rede ao exportar");
    err.code = "ERRO_GENERICO";
    throw err;
  }

  if (!resp.ok) {
    const err: any = new Error(
      resp.status === 401
        ? "Sessão expirada."
        : resp.status === 404 || resp.status === 405 || resp.status === 501
        ? "Exportação ainda não disponível no backend."
        : `Falha ao exportar (HTTP ${resp.status})`,
    );
    err.statusCode = resp.status;
    throw err;
  }

  const blob = await resp.blob();
  const disposition = resp.headers.get("Content-Disposition");
  let filename = `rh04_programacao_ferias_${codempStr}.xlsx`;
  if (disposition) {
    const m = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
    if (m?.[1]) filename = decodeURIComponent(m[1].replace(/"/g, ""));
  }
  return { blob, filename };
}


// ===== RH-05 Turnover =====
export interface TurnoverParams {
  anomes_ini: string;
  anomes_fim: string;
  codemp?: number;
}
export async function fetchTurnoverDashboard(
  p: TurnoverParams,
): Promise<import("./types").TurnoverDashboard> {
  const resp = await api.get<any>(
    "/api/rh/turnover/dashboard",
    cleanParams({
      anomes_ini: toAnomes(p.anomes_ini),
      anomes_fim: toAnomes(p.anomes_fim),
      codemp: p.codemp ?? 1,
    }),
  );
  const k = resp?.kpis ?? {};
  return {
    kpis: {
      admitidos: num(k.admitidos),
      demitidos: num(k.demitidos),
      saldo: num(k.saldo),
      headcount_inicio: num(k.headcount_inicio),
      headcount_fim: num(k.headcount_fim),
      headcount_medio: num(k.headcount_medio),
      taxa_rotatividade_pct: num(k.taxa_rotatividade_pct),
    },
    por_mes: Array.isArray(resp?.por_mes) ? resp.por_mes : [],
    por_motivo: Array.isArray(resp?.por_motivo) ? resp.por_motivo : [],
    por_empresa: Array.isArray(resp?.por_empresa) ? resp.por_empresa : [],
    detalhe_admitidos: Array.isArray(resp?.detalhe_admitidos) ? resp.detalhe_admitidos : [],
    detalhe_demitidos: Array.isArray(resp?.detalhe_demitidos) ? resp.detalhe_demitidos : [],
  };
}


// ===== RH-06 Absenteísmo =====
export interface AbsenteismoParams {
  anomes_ini: string;
  anomes_fim: string;
  codemp?: number;
}
export async function fetchAbsenteismoDashboard(
  p: AbsenteismoParams,
): Promise<import("./types").AbsenteismoDashboard> {
  const resp = await api.get<any>(
    "/api/rh/absenteismo/dashboard",
    cleanParams({
      anomes_ini: toAnomes(p.anomes_ini),
      anomes_fim: toAnomes(p.anomes_fim),
      codemp: p.codemp ?? 1,
    }),
  );
  const k = resp?.kpis ?? {};
  return {
    kpis: {
      taxa_absenteismo_pct: num(k.taxa_absenteismo_pct),
      afastamentos: num(k.afastamentos),
      colaboradores_afastados: num(k.colaboradores_afastados),
      dias_perdidos: num(k.dias_perdidos),
      duracao_media_dias: num(k.duracao_media_dias),
      headcount_medio: num(k.headcount_medio),
      dias_periodo: num(k.dias_periodo),
    },
    por_categoria: Array.isArray(resp?.por_categoria) ? resp.por_categoria : [],
    por_motivo: Array.isArray(resp?.por_motivo) ? resp.por_motivo : [],
    por_mes: Array.isArray(resp?.por_mes) ? resp.por_mes : [],
    por_empresa: Array.isArray(resp?.por_empresa) ? resp.por_empresa : [],
    detalhe: Array.isArray(resp?.detalhe) ? resp.detalhe : [],
  };
}
export function getAbsenteismoExportUrl(p: AbsenteismoParams): string {
  return api.getExportUrl("/api/rh/absenteismo/exportar", {
    anomes_ini: toAnomes(p.anomes_ini),
    anomes_fim: toAnomes(p.anomes_fim),
    codemp: p.codemp ?? 1,
  });
}


// ===== Cache persistente (Lovable Cloud) para dashboards do RH =====
import { withRhCache, RH_CACHE_DEFAULT_TTL_MS } from "./rhCache";

export async function fetchResumoFolhaDashboardCached(
  p: ResumoFolhaParams & { codemp?: number },
  modo: ResumoFolhaModo = "completo",
): Promise<ResumoFolhaDashboard> {
  const key = `rh:folha:${modo}:${p.codemp ?? 1}:${toAnomes(p.anomes_ini)}:${toAnomes(p.anomes_fim)}:${p.filial ?? ""}:${p.matricula ?? ""}`;
  return withRhCache(key, RH_CACHE_DEFAULT_TTL_MS, () => fetchResumoFolhaDashboard(p, modo));
}

export async function fetchTurnoverDashboardCached(
  p: TurnoverParams,
): Promise<import("./types").TurnoverDashboard> {
  const key = `rh:turnover:${p.codemp ?? 1}:${toAnomes(p.anomes_ini)}:${toAnomes(p.anomes_fim)}`;
  return withRhCache(key, RH_CACHE_DEFAULT_TTL_MS, () => fetchTurnoverDashboard(p));
}

export async function fetchAbsenteismoDashboardCached(
  p: AbsenteismoParams,
): Promise<import("./types").AbsenteismoDashboard> {
  const key = `rh:absenteismo:${p.codemp ?? 1}:${toAnomes(p.anomes_ini)}:${toAnomes(p.anomes_fim)}`;
  return withRhCache(key, RH_CACHE_DEFAULT_TTL_MS, () => fetchAbsenteismoDashboard(p));
}

export async function fetchContratoExperienciaDashboardCached(
  codemp: number = 1,
  diasVencidoMax: number = 90,
): Promise<import("./types").ContratoExperienciaDashboard> {
  const key = `rh:contrato-exp:${codemp}:${diasVencidoMax}`;
  return withRhCache(key, RH_CACHE_DEFAULT_TTL_MS, () =>
    fetchContratoExperienciaDashboard(codemp, diasVencidoMax),
  );
}

export async function fetchProgramacaoFeriasDashboardCached(
  codemp: number = 1,
): Promise<import("./types").ProgramacaoFeriasDashboard> {
  const key = `rh:programacao-ferias:v2:${codemp}`;
  return withRhCache(key, RH_CACHE_DEFAULT_TTL_MS, () => fetchProgramacaoFeriasDashboard(codemp));
}



