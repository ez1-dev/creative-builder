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

export interface QuadroEmpresaLinha {
  empresa: string;
  colaboradores?: number | null;
  trabalhando?: number | null;
  admitidos?: number | null;
  demitidos?: number | null;
  pcd?: number | null;
  estagiarios?: number | null;
  jovem_aprendiz?: number | null;
  ferias?: number | null;
  aposentadoria_invalidez?: number | null;
  auxilio_doenca?: number | null;
  acidente_trabalho?: number | null;
  atestados?: number | null;
  licenca_maternidade?: number | null;
  homens?: number | null;
  mulheres?: number | null;
}

export interface DrillDimension {
  chave: string;
  label: string;
}

export type ColaboradorDetalhe = {
  colaborador?: string;
  matricula?: string;
  empresa?: string;
  filial?: string;
  cargo?: string;
  centro_custo?: string;
  escolaridade?: string;
  faixa_etaria?: string;
  tempo_casa?: string;
  sexo?: string;
  situacao?: string;
  vinculo?: string;
  pcd?: string;
  idade?: number;
  dt_admissao?: string;
  [k: string]: any;
};

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
  empresa_detalhado?: QuadroEmpresaLinha[] | null;
  raw?: any;
}

export interface QuadroHistoricoItem {
  anomes: string;
  total: number;
}


function toNumOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n =
    typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
  return isFinite(n) ? n : null;
}

function normText(s: any): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function pickFirst(src: any, keys: string[]): any {
  if (!src || typeof src !== "object") return undefined;
  for (const k of keys) {
    if (k in src && src[k] !== undefined && src[k] !== null) return src[k];
  }
  // buscar aninhado em distribuicoes/quebras/dados/resumo
  for (const parent of ["distribuicoes", "quebras", "dados", "resumo"]) {
    const p = (src as any)[parent];
    if (p && typeof p === "object") {
      for (const k of keys) {
        if (k in p && p[k] !== undefined && p[k] !== null) return p[k];
      }
    }
  }
  return undefined;
}

function toBreakdown(raw: any): QuadroBreakdown | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) {
    return raw.map((r: any) => {
      if (r && typeof r === "object") {
        const label = String(
          r.label ?? r.descricao ?? r.nome ?? r.categoria ?? r.chave ?? r.key ?? r.tipo ?? r.sexo ?? r.situacao ?? r.afastamento ?? r.empresa ?? r.grupo ?? r.classificacao ?? "-",
        );
        const valor =
          Number(
            r.valor ?? r.total ?? r.quantidade ?? r.qtd ?? r.colaboradores ?? r.total_colaboradores ?? r.qtd_colaboradores ?? 0,
          ) || 0;
        return { label, valor };
      }
      return { label: String(r), valor: 0 };
    });
  }
  if (typeof raw === "object") {
    return Object.entries(raw).map(([k, v]) => ({
      label: String(k),
      valor: Number(v) || 0,
    }));
  }
  return undefined;
}

function pickBreakdown(src: any, keys: string[]): QuadroBreakdown | undefined {
  const raw = pickFirst(src, keys);
  return toBreakdown(raw);
}

const SEXO_KEYS = ["sexo", "por_sexo", "distribuicao_sexo"];
const SITUACAO_KEYS = ["situacao", "situacoes", "afastamento", "afastamentos", "por_situacao"];

function normalizeSexoBreakdown(b?: QuadroBreakdown): QuadroBreakdown | undefined {
  if (!b) return undefined;
  const out: QuadroBreakdown = [];
  let masc = 0, fem = 0, hasM = false, hasF = false;
  for (const it of b) {
    const n = normText(it.label);
    if (n === "M" || n === "MASCULINO" || n === "MALE") { masc += it.valor; hasM = true; }
    else if (n === "F" || n === "FEMININO" || n === "FEMALE") { fem += it.valor; hasF = true; }
    else out.push(it);
  }
  const norm: QuadroBreakdown = [];
  if (hasM || hasF) {
    norm.push({ label: "Masculino", valor: masc });
    norm.push({ label: "Feminino", valor: fem });
  }
  return [...norm, ...out];
}

function findSituacaoValor(b: QuadroBreakdown, matches: string[], codigos?: (string | number)[], rawList?: any[]): number | null {
  // procura por label
  for (const it of b) {
    const n = normText(it.label);
    if (matches.some((m) => n.includes(m))) return it.valor;
  }
  // procura por código na lista raw
  if (codigos && rawList) {
    for (const r of rawList) {
      if (!r || typeof r !== "object") continue;
      const cod = r.codigo ?? r.cd_situacao ?? r.cod ?? r.code;
      if (cod !== undefined && codigos.some((c) => String(c) === String(cod))) {
        return Number(r.valor ?? r.total ?? r.quantidade ?? r.qtd ?? 0) || 0;
      }
    }
  }
  return null;
}

function normalizeDashboard(raw: any): QuadroDashboard {
  const kpisSrc = raw?.kpis ?? raw ?? {};

  const sexoRawArr = pickFirst(raw, SEXO_KEYS);
  const sexoBreakdownRaw = toBreakdown(sexoRawArr);
  const sexoBreakdown = normalizeSexoBreakdown(sexoBreakdownRaw);

  const sitRawArr = pickFirst(raw, SITUACAO_KEYS);
  const sitBreakdownRaw = toBreakdown(sitRawArr);
  const sitRawList = Array.isArray(sitRawArr) ? sitRawArr : undefined;

  // Sexo direto do objeto (formato {M:360,F:67})
  let sexoMap: Record<string, number> | null = null;
  if (sexoRawArr && !Array.isArray(sexoRawArr) && typeof sexoRawArr === "object") {
    sexoMap = {};
    for (const [k, v] of Object.entries(sexoRawArr)) {
      sexoMap[normText(k)] = Number(v) || 0;
    }
  }

  function kpiMasc(): number | null | undefined {
    const direct = toNumOrNull(kpisSrc?.masculino ?? kpisSrc?.sexo_masculino ?? kpisSrc?.qtd_masculino);
    if (direct !== null) return direct;
    if (sexoMap) {
      const v = sexoMap["M"] ?? sexoMap["MASCULINO"] ?? sexoMap["MALE"];
      if (v !== undefined) return v;
      // bloco existe sem M
      if (Object.keys(sexoMap).length > 0) return 0;
    }
    if (sexoBreakdownRaw) {
      const found = sexoBreakdownRaw.find((it) => {
        const n = normText(it.label);
        return n === "M" || n === "MASCULINO" || n === "MALE";
      });
      return found ? found.valor : 0;
    }
    return null;
  }
  function kpiFem(): number | null | undefined {
    const direct = toNumOrNull(kpisSrc?.feminino ?? kpisSrc?.sexo_feminino ?? kpisSrc?.qtd_feminino);
    if (direct !== null) return direct;
    if (sexoMap) {
      const v = sexoMap["F"] ?? sexoMap["FEMININO"] ?? sexoMap["FEMALE"];
      if (v !== undefined) return v;
      if (Object.keys(sexoMap).length > 0) return 0;
    }
    if (sexoBreakdownRaw) {
      const found = sexoBreakdownRaw.find((it) => {
        const n = normText(it.label);
        return n === "F" || n === "FEMININO" || n === "FEMALE";
      });
      return found ? found.valor : 0;
    }
    return null;
  }

  function kpiFromSituacao(aliases: string[], matches: string[], codigos?: (string | number)[]): number | null {
    for (const a of aliases) {
      if (a in kpisSrc) {
        const v = toNumOrNull(kpisSrc[a]);
        if (v !== null) return v;
      }
    }
    if (sitBreakdownRaw) {
      return findSituacaoValor(sitBreakdownRaw, matches, codigos, sitRawList);
    }
    return null;
  }

  const kpis: QuadroKpis = {
    total: toNumOrNull(kpisSrc?.total ?? kpisSrc?.total_colaboradores ?? kpisSrc?.colaboradores),
    masculino: kpiMasc() ?? null,
    feminino: kpiFem() ?? null,
    jovem_aprendiz: toNumOrNull(kpisSrc?.jovem_aprendiz ?? kpisSrc?.jovens_aprendizes ?? kpisSrc?.aprendiz),
    estagiarios: toNumOrNull(kpisSrc?.estagiarios ?? kpisSrc?.estagiario ?? kpisSrc?.estagiarias),
    pcd: toNumOrNull(kpisSrc?.pcd ?? kpisSrc?.qtd_pcd),
    admitidos_mes: toNumOrNull(kpisSrc?.admitidos_mes ?? kpisSrc?.admissoes_mes ?? kpisSrc?.admitidos),
    demitidos_mes: toNumOrNull(kpisSrc?.demitidos_mes ?? kpisSrc?.demissoes_mes ?? kpisSrc?.demitidos),
    trabalhando: kpiFromSituacao(["trabalhando", "ativos_trabalhando"], ["TRABALHANDO", "ATIVO"]),
    ferias: kpiFromSituacao(["ferias", "em_ferias"], ["FERIAS"]),
    auxilio_doenca: kpiFromSituacao(["auxilio_doenca", "aux_doenca"], ["AUXILIO DOENCA", "AUX DOENCA", "AUX. DOENCA"]),
    acidente: kpiFromSituacao(["acidente", "acidente_trabalho"], ["ACIDENTE"]),
    licenca_maternidade: kpiFromSituacao(
      ["licenca_maternidade", "lic_maternidade", "maternidade"],
      ["MATERNIDADE", "LIC MATERNIDADE", "LIC.MATERNIDADE"],
      [6],
    ),
  };
  const apo = toNumOrNull(kpisSrc?.aposentadoria ?? kpisSrc?.aposentados);
  if (apo !== null) kpis.aposentadoria = apo;

  const empresaDetalhado = pickEmpresaMatriz(raw);
  const empresaBreakdown =
    pickBreakdown(raw, ["empresa", "empresas", "por_empresa"]) ??
    (empresaDetalhado
      ? empresaDetalhado
          .filter((e) => typeof e.colaboradores === "number")
          .map((e) => ({ label: e.empresa, valor: e.colaboradores as number }))
      : undefined);

  return {
    data_ref: raw?.data_ref,
    kpis,
    sexo: sexoBreakdown,
    escolaridade: pickBreakdown(raw, ["escolaridade", "por_escolaridade"]),
    faixa_etaria: pickBreakdown(raw, ["faixa_etaria", "faixas_etarias", "por_faixa_etaria", "idade"]),
    tempo_casa: pickBreakdown(raw, ["tempo_casa", "tempo_de_casa", "por_tempo_casa"]),
    filial: pickBreakdown(raw, ["filial", "filiais", "por_filial"]),
    situacao: sitBreakdownRaw,
    vinculo: pickBreakdown(raw, ["vinculo", "vinculos", "por_vinculo", "tipo_vinculo"]),
    empresa: empresaBreakdown ?? null,
    empresa_detalhado: empresaDetalhado ?? null,
    raw,
  };
}

const EMPRESA_KPI_ALIASES: Record<keyof Omit<QuadroEmpresaLinha, "empresa">, string[]> = {
  colaboradores: ["colaboradores", "total_colaboradores", "qtd_colaboradores", "total", "qtd", "quantidade", "headcount"],
  trabalhando: ["trabalhando", "ativos", "qtd_trabalhando", "em_trabalho"],
  admitidos: ["admitidos", "admissoes", "admitidos_mes", "qtd_admitidos"],
  demitidos: ["demitidos", "demissoes", "demitidos_mes", "qtd_demitidos"],
  pcd: ["pcd", "qtd_pcd"],
  estagiarios: ["estagiarios", "estagiario", "qtd_estagiarios"],
  jovem_aprendiz: ["jovem_aprendiz", "aprendiz", "jovens_aprendizes"],
  ferias: ["ferias", "em_ferias"],
  aposentadoria_invalidez: ["apos_invalidez", "aposentadoria_invalidez", "aposent_invalidez", "aposentadoria", "aposentados", "invalidez"],
  auxilio_doenca: ["auxilio_doenca", "aux_doenca", "auxilio"],
  acidente_trabalho: ["acidente_trabalho", "acidente", "acidentes"],
  atestados: ["atestados", "atestado"],
  licenca_maternidade: ["licenca_maternidade", "lic_maternidade", "maternidade"],
  homens: ["homens", "masculino", "qtd_masculino"],
  mulheres: ["mulheres", "feminino", "qtd_feminino"],
};

function pickEmpresaMatriz(raw: any): QuadroEmpresaLinha[] | undefined {
  const src = pickFirst(raw, [
    "empresa_detalhado",
    "empresas_detalhado",
    "por_empresa_detalhado",
    "empresa_kpis",
    "empresas",
    "por_empresa",
    "empresa",
  ]);
  if (!src) return undefined;
  const arr = Array.isArray(src)
    ? src
    : typeof src === "object"
      ? Object.entries(src).map(([k, v]) =>
          typeof v === "object" && v !== null ? { empresa: k, ...(v as any) } : { empresa: k, colaboradores: Number(v) || 0 },
        )
      : [];
  if (!arr.length) return undefined;

  // se todos os itens só têm empresa+colaboradores, ainda vale montar a matriz (renderiza "—" nas demais)
  const linhas: QuadroEmpresaLinha[] = arr.map((r: any) => {
    const linha: QuadroEmpresaLinha = {
      empresa: String(
        r.empresa ?? r.label ?? r.nome ?? r.descricao ?? r.grupo ?? r.classificacao ?? "-",
      ),
    };
    for (const [key, aliases] of Object.entries(EMPRESA_KPI_ALIASES) as [
      keyof Omit<QuadroEmpresaLinha, "empresa">,
      string[],
    ][]) {
      let v: any = undefined;
      for (const a of aliases) {
        if (r && typeof r === "object" && a in r) {
          v = r[a];
          break;
        }
      }
      if (v === undefined) continue;
      if (v === null) {
        (linha as any)[key] = null;
      } else {
        const n = Number(v);
        (linha as any)[key] = isFinite(n) ? n : null;
      }
    }
    return linha;
  });
  return linhas;
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
  // eslint-disable-next-line no-console
  console.log("[RH Quadro] historico", { anomesIni, anomesFim, raw: resp });
  const arr = Array.isArray(resp)
    ? resp
    : (resp?.historico ?? resp?.dados ?? resp?.items ?? resp?.data ?? resp?.series ?? []);
  const rows: { anomes: string; valor: number }[] = (Array.isArray(arr) ? arr : []).map((r: any) => ({
    anomes: String(
      r.anomes ??
        r.anomes_competencia ??
        r.ano_mes_competencia ??
        r.mes ??
        r.competencia ??
        r.ano_mes ??
        r.periodo ??
        r.dt_competencia ??
        "",
    ).replace(/\D/g, ""),
    valor:
      Number(
        r.colaboradores ??
          r.total_colaboradores ??
          r.qtd_colaboradores ??
          r.nr_colaboradores ??
          r.ativos ??
          r.qtd_ativos ??
          r.headcount ??
          r.quantidade ??
          r.qtd ??
          r.qtde ??
          r.valor ??
          r.total ??
          0,
      ) || 0,
  }));
  // agrupar por competência (soma quando API devolve múltiplas linhas por anomes)
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.anomes) continue;
    map.set(r.anomes, (map.get(r.anomes) ?? 0) + r.valor);
  }
  const list: QuadroHistoricoItem[] = Array.from(map.entries()).map(([anomes, total]) => ({
    anomes,
    total,
  }));
  list.sort((a, b) => a.anomes.localeCompare(b.anomes));
  return list;
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
