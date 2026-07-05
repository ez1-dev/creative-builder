import { api, getApiUrl } from "@/lib/api";

export type QuadroBreakdown = { label: string; valor: number }[];

export interface QuadroKpis {
  total?: number | null;
  masculino?: number | null;
  feminino?: number | null;
  jovem_aprendiz?: number | null;
  estagiarios?: number | null;
  pcd?: number | null;
  admitidos_mes?: number | null;
  demitidos_mes?: number | null;
  trabalhando?: number | null;
  ferias?: number | null;
  auxilio_doenca?: number | null;
  acidente?: number | null;
  licenca_maternidade?: number | null;
  aposentadoria?: number | null;
  [k: string]: number | null | undefined;
}

export interface QuadroDashboard {
  data_ref?: string;
  kpis: QuadroKpis;
  sexo?: QuadroBreakdown;
  escolaridade?: QuadroBreakdown;
  faixa_etaria?: QuadroBreakdown;
  tempo_casa?: QuadroBreakdown;
  filial?: QuadroBreakdown;
  situacao?: QuadroBreakdown;
  vinculo?: QuadroBreakdown;
  empresa?: QuadroBreakdown | null;
  raw?: any;
}

export interface QuadroHistoricoItem {
  anomes: string;
  total: number;
}

function toNumOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
  return isFinite(n) ? n : null;
}

function pickBreakdown(src: any, keys: string[]): QuadroBreakdown | undefined {
  for (const k of keys) {
    const v = src?.[k];
    if (Array.isArray(v)) {
      return v.map((r: any) => ({
        label: String(
          r.label ?? r.descricao ?? r.nome ?? r.categoria ?? r.chave ?? r.key ?? r.tipo ?? "-"
        ),
        valor: Number(r.valor ?? r.total ?? r.quantidade ?? r.qtd ?? 0) || 0,
      }));
    }
  }
  return undefined;
}

const KPI_MAP: Record<keyof QuadroKpis, string[]> = {
  total: ["total", "total_colaboradores", "colaboradores"],
  masculino: ["masculino", "sexo_masculino", "qtd_masculino"],
  feminino: ["feminino", "sexo_feminino", "qtd_feminino"],
  jovem_aprendiz: ["jovem_aprendiz", "jovens_aprendizes", "aprendiz"],
  estagiarios: ["estagiarios", "estagiario", "estagiarias"],
  pcd: ["pcd", "qtd_pcd"],
  admitidos_mes: ["admitidos_mes", "admissoes_mes", "admitidos"],
  demitidos_mes: ["demitidos_mes", "demissoes_mes", "demitidos"],
  trabalhando: ["trabalhando", "ativos_trabalhando"],
  ferias: ["ferias", "em_ferias"],
  auxilio_doenca: ["auxilio_doenca", "aux_doenca"],
  acidente: ["acidente", "acidente_trabalho"],
  licenca_maternidade: ["licenca_maternidade", "lic_maternidade", "maternidade"],
  aposentadoria: ["aposentadoria", "aposentados"],
};

function normalizeDashboard(raw: any): QuadroDashboard {
  const kpisSrc = raw?.kpis ?? raw ?? {};
  const kpis: QuadroKpis = {};
  for (const [field, aliases] of Object.entries(KPI_MAP) as [keyof QuadroKpis, string[]][]) {
    let present = false;
    let value: any = undefined;
    for (const a of aliases) {
      if (a in kpisSrc) {
        present = true;
        value = kpisSrc[a];
        break;
      }
    }
    if (!present) {
      // Se não veio, marca como null (campo pendente) — exceto aposentadoria que fica undefined (oculto)
      if (field === "aposentadoria") continue;
      kpis[field] = null;
    } else {
      kpis[field] = toNumOrNull(value);
    }
  }

  return {
    data_ref: raw?.data_ref,
    kpis,
    sexo: pickBreakdown(raw, ["sexo", "por_sexo", "distribuicao_sexo"]),
    escolaridade: pickBreakdown(raw, ["escolaridade", "por_escolaridade"]),
    faixa_etaria: pickBreakdown(raw, ["faixa_etaria", "faixas_etarias", "por_faixa_etaria", "idade"]),
    tempo_casa: pickBreakdown(raw, ["tempo_casa", "tempo_de_casa", "por_tempo_casa"]),
    filial: pickBreakdown(raw, ["filial", "filiais", "por_filial"]),
    situacao: pickBreakdown(raw, ["situacao", "situacoes", "afastamento", "por_situacao"]),
    vinculo: pickBreakdown(raw, ["vinculo", "vinculos", "por_vinculo", "tipo_vinculo"]),
    empresa: pickBreakdown(raw, ["empresa", "empresas", "por_empresa"]) ?? null,
    raw,
  };
}

export async function fetchQuadroDashboard(dataRef: string): Promise<QuadroDashboard> {
  const resp = await api.get<any>("/api/rh/quadro-colaboradores/dashboard", { data_ref: dataRef });
  const norm = normalizeDashboard(resp ?? {});
  // eslint-disable-next-line no-console
  console.log("[RH Quadro] dashboard", { data_ref: dataRef, kpis: norm.kpis, raw: resp });
  return norm;
}

export async function fetchQuadroHistorico(
  anomesIni: string,
  anomesFim: string,
): Promise<QuadroHistoricoItem[]> {
  const resp = await api.get<any>("/api/rh/quadro-colaboradores/historico", {
    anomes_ini: anomesIni,
    anomes_fim: anomesFim,
  });
  const arr = Array.isArray(resp) ? resp : (resp?.dados ?? resp?.items ?? resp?.data ?? []);
  return arr.map((r: any) => ({
    anomes: String(r.anomes ?? r.ano_mes ?? r.competencia ?? ""),
    total: Number(r.total ?? r.total_colaboradores ?? r.colaboradores ?? r.valor ?? 0) || 0,
  }));
}

export class ExportQuadroIndisponivelError extends Error {
  code = "EXPORT_INDISPONIVEL" as const;
}

export async function exportQuadroDashboard(dataRef: string): Promise<Blob> {
  const qs = new URLSearchParams({ data_ref: dataRef }).toString();
  const url = `${getApiUrl()}/api/rh/quadro-colaboradores/export?${qs}`;
  const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" };
  const token = api.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (res.status === 404 || res.status === 405 || res.status === 501) {
    throw new ExportQuadroIndisponivelError();
  }
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return await res.blob();
}
