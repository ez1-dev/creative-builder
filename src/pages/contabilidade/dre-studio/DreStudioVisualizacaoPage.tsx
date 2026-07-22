import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FloatingHScrollbar } from "@/components/dre-studio/FloatingHScrollbar";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, Database, Calculator, CalendarRange, AlertTriangle,
  ChevronRight, ChevronDown, ChevronsUpDown, ChevronsDownUp, FileSpreadsheet, Loader2, Coins,
} from "lucide-react";
import { ResultadoExercicioDialog } from "@/components/contabil/ResultadoExercicioDialog";


import { MoneyCell, fmtBRL, fmtPct, MoneyDisplayProvider, arredondarComercial } from "@/components/contabil/MoneyCell";
import { ValidacaoCCCC106 } from "@/components/contabil/ValidacaoCCCC106";

import { PendenciasCtaredZeroPanel } from "@/components/contabil/PendenciasCtaredZeroPanel";
import { ConciliacaoSeniorMensalTable } from "@/components/contabil/ConciliacaoSeniorMensalTable";
import { useConciliacaoSeniorMensal } from "@/hooks/contabil/useConciliacaoSeniorMensal";

import { DrillDrawer, type DrillArgs } from "@/components/contabil/DrillDrawer";
import { DrillsMenu } from "@/components/dre-studio/DrillsMenu";
import { DrillResultadoPanel, type DrillResultadoContext } from "@/components/dre-studio/DrillResultadoPanel";
import { normalizarDrillDimensao, type DrillDimensao } from "@/lib/contabil/drillDreApi";
import { possuiDrill, type DrillMenuItem } from "@/lib/contabil/drillsMenu";

import {
  useCentrosCusto,
  useModelo,
  useResultadoPronto,
  useMaterializarResultado,
  usePeriodosStatus,
} from "@/hooks/contabil/api";
import { MaterializacaoDialog } from "@/components/contabil/MaterializacaoDialog";
import { HistoricoCacheDialog } from "@/components/contabil/HistoricoCacheDialog";
import { History } from "lucide-react";

import type { ComparativoLinhaV2, ContaVinculada, ModoBalanco, PeriodoStatus } from "@/types/contabil";

import { formatAnomes, isTotalAnoCol, isAcumuladoAnoCol } from "@/lib/anomes";
import { CODFIL } from "@/lib/contabilConfig";
import { useContabilConfiguracao } from "@/hooks/contabil/useContabilConfiguracao";
import { ConciliacaoDREBalancoPanel } from "@/components/contabil/ConciliacaoDREBalancoPanel";

import { cn } from "@/lib/utils";
import { getUnidadeCapabilities } from "@/lib/contabil/unidadeCapabilities";
import { useCriarBalancoPadraoSenior } from "@/hooks/contabil/useCriarBalancoPadraoSenior";
import { useVincularContasBalancoSenior } from "@/hooks/contabil/useVincularContasBalancoSenior";
import { Link2, Pencil, CheckCircle2, ArrowRight, PlayCircle } from "lucide-react";
import { DreEstruturaEditor } from "@/components/contabil/edicao/DreEstruturaEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FilterPresetBar } from "@/components/filters/FilterPresetBar";
import { useFilterPresets } from "@/hooks/useFilterPresets";
import { truncateLabel } from "@/lib/textTruncate";

const DRE_VIS_PAGE_KEY = "dre-studio-visualizacao";
interface DreVisFilterPreset {
  anoSelecionado?: number;
  mesesVisiveis?: number[];
  codccu?: string;
  codfil?: string;
  visao?: Visao;
  dataIni?: string;
  dataFim?: string;
  modoBalanco?: ModoBalanco;
  dataCorte?: string;
  aplicarRefSenior?: boolean;
  expandirRE?: boolean;
}


type Visao = "REAL" | "ORC" | "VARV" | "VARP" | "COMP";

const SUB_COLS: Array<{ key: "realizado" | "orcado" | "variacao" | "variacao_percentual"; label: string; pct?: boolean }> = [
  { key: "realizado", label: "Real" },
  { key: "orcado", label: "Orç" },
  { key: "variacao", label: "Var" },
  { key: "variacao_percentual", label: "%", pct: true },
];

const MESES_ANO: Array<{ mes: number; label: string }> = [
  { mes: 1, label: "Jan" }, { mes: 2, label: "Fev" }, { mes: 3, label: "Mar" },
  { mes: 4, label: "Abr" }, { mes: 5, label: "Mai" }, { mes: 6, label: "Jun" },
  { mes: 7, label: "Jul" }, { mes: 8, label: "Ago" }, { mes: 9, label: "Set" },
  { mes: 10, label: "Out" }, { mes: 11, label: "Nov" }, { mes: 12, label: "Dez" },
];

function pickValue(l: ComparativoLinhaV2, visao: Visao, col: string): number | null {
  switch (visao) {
    case "REAL": return l.realizado?.[col] ?? null;
    case "ORC": return l.orcado?.[col] ?? null;
    case "VARV": return l.variacao?.[col] ?? null;
    case "VARP": return l.variacao_percentual?.[col] ?? null;
    case "COMP": return l.realizado?.[col] ?? null;
  }
}

const isLinhaVincular = (l: Pick<ComparativoLinhaV2, "codigo" | "natureza">) =>
  String(l.codigo ?? "").toUpperCase() === "VINCULAR" ||
  String(l.natureza ?? "").toUpperCase() === "VINCULAR";

const isLinhaTotalGeral = (l: Pick<ComparativoLinhaV2, "codigo" | "descricao">) =>
  String(l.codigo ?? "") === "999" ||
  String(l.descricao ?? "").trim().toUpperCase() === "TOTAL GERAL";

const isLinha000 = (l: Pick<ComparativoLinhaV2, "codigo" | "descricao">) =>
  String(l.codigo ?? "").trim() === "000" ||
  String(l.descricao ?? "").trim().toUpperCase().startsWith("LANÇAMENTOS SEM CONTA") ||
  String(l.descricao ?? "").trim().toUpperCase().startsWith("LANCAMENTOS SEM CONTA");

const isLinha98 = (l: Pick<ComparativoLinhaV2, "codigo">) =>
  String(l.codigo ?? "").trim() === "98";

const isLinha99 = (l: Pick<ComparativoLinhaV2, "codigo" | "descricao">) =>
  String(l.codigo ?? "").trim() === "99" && !isLinhaTotalGeral(l);

// Linhas técnicas do Balanço (fora da árvore principal, ocultas por padrão).
// 99 e VINCULAR foram promovidas a linhas oficiais de Nível 1 e NÃO entram aqui.
const isLinhaTecnicaBalanco = (l: ComparativoLinhaV2) =>
  isLinha000(l) || isLinha98(l) || isLinha99(l) || isLinhaTotalGeral(l);

// Allow-list explícita para Nível 1 do Balanço (não depender de linha_pai_id = null,
// pois linhas técnicas também têm pai nulo).
const CODIGOS_NIVEL_1_BALANCO = new Set(["1", "2", "VINCULAR"]);
const codigoNorm = (l: Pick<ComparativoLinhaV2, "codigo">) =>
  String(l.codigo ?? "").toUpperCase().trim();
const isNivel1Balanco = (l: Pick<ComparativoLinhaV2, "codigo">) =>
  CODIGOS_NIVEL_1_BALANCO.has(codigoNorm(l));

const normalizarFonteTecnica = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_\-/]+/g, ".")
    .replace(/\.+/g, ".");

const fonteEhE650Salmes = (...values: unknown[]) =>
  values.some((v) => {
    const fonte = normalizarFonteTecnica(v);
    return fonte.includes("E650SAL.SALMES") || fonte.includes("E650SAL");
  });


const isLinhaEspecial = (l: ComparativoLinhaV2) =>
  isLinha000(l) || isLinha98(l) || isLinha99(l) ||
  isLinhaVincular(l) || isLinhaTotalGeral(l);


function linhaSemValores(l: ComparativoLinhaV2, colunas: string[]): boolean {
  if (isLinhaEspecial(l)) return false;
  if (l.tipo_linha !== "GRUPO" && l.tipo_linha !== "SUBTOTAL" && l.tipo_linha !== "TOTAL") return false;
  for (const c of colunas) {
    const v = l.realizado?.[c];
    if (v !== null && v !== undefined && v !== 0) return false;
  }
  return true;
}


function formatarCampoContas(
  contas: ContaVinculada[],
  campo: "ctared" | "clacta",
): string {
  if (!contas.length) return "-";
  const fmt = (c: ContaVinculada) => {
    const v = c[campo];
    return v ? String(v) : "-";
  };
  const primeiras = contas.slice(0, 3).map(fmt);
  const restantes = contas.length - primeiras.length;
  return restantes > 0 ? `${primeiras.join(", ")} +${restantes}` : primeiras.join(", ");
}

function formatarCampoContasExcel(
  contas: ContaVinculada[],
  campo: "ctared" | "clacta",
): string {
  if (!contas.length) return "-";
  return contas.map((c) => (c[campo] ? String(c[campo]) : "-")).join(", ");
}

function getCodigoNivel3(linha: { codigo?: string | null }): string {
  const codigo = String(linha.codigo ?? "").replace(/\D/g, "");
  if (!codigo) return "";
  return codigo.length >= 3 ? codigo.substring(0, 3) : codigo;
}

type Modo = "SINTETICO" | "ANALITICO" | "NIVEL3";

interface GrupoNivel3 {
  natureza: string;
  codigo: string;
  descricao: string;
  valores: Record<string, number>;
  total: number;
}



function pad2(n: number) { return String(n).padStart(2, "0"); }
function firstDayOfAnomes(anomes: number): string {
  const y = Math.floor(anomes / 100);
  const m = anomes % 100;
  return `${y}-${pad2(m)}-01`;
}
function lastDayOfAnomes(anomes: number): string {
  const y = Math.floor(anomes / 100);
  const m = anomes % 100;
  const d = new Date(y, m, 0).getDate();
  return `${y}-${pad2(m)}-${pad2(d)}`;
}
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function defaultDataFim(anomesFim: number): string {
  const today = todayIso();
  const last = lastDayOfAnomes(anomesFim);
  return today < last ? today : last;
}

interface VisualizacaoProps {
  modeloIdProp?: string;
  modoBloqueado?: boolean;
  permiteConfigurar?: boolean;
  onConfigurar?: () => void;
  /** Notifica o pai (ex.: DRE Padrão) sobre a capacidade de filtro por unidade. */
  onSuporteUnidadeChange?: (suporta: boolean) => void;
  onCapabilitiesChange?: (caps: import('@/lib/contabil/unidadeCapabilities').UnidadeCapabilities) => void;
}

function Visualizacao(props: VisualizacaoProps = {}) {
  const params = useParams() as any;
  const id = props.modeloIdProp ?? params.id;
  const modoBloqueado = !!props.modoBloqueado;
  const matrizScrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const recriarCompleto = useCriarBalancoPadraoSenior();
  const [confirmRecriar, setConfirmRecriar] = useState(false);
  const anoAtual = new Date().getFullYear();
  const [anoSelecionado, setAnoSelecionado] = useState<number>(anoAtual);
  const [mesesVisiveis, setMesesVisiveis] = useState<number[]>([1,2,3,4,5,6,7,8,9,10,11,12]);
  const ini = anoSelecionado * 100 + 1;
  const fim = anoSelecionado * 100 + 12;
  const [codccu, setCodccu] = useState<string>("todos");
  const [codfil, setCodfil] = useState<string>("todas");
  const [unidade, setUnidade] = useState<string>("TODOS");
  const [visao, setVisao] = useState<Visao>("REAL");
  const [drill, setDrill] = useState<DrillArgs | null>(null);
  const [drillCtx, setDrillCtx] = useState<DrillResultadoContext | null>(null);
  
  const [openHistoricoCache, setOpenHistoricoCache] = useState(false);
  const [editorEstruturaOpen, setEditorEstruturaOpen] = useState(false);
  const [filtrosSalvosOpen, setFiltrosSalvosOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("dre-vis:filtros-salvos-open") === "1"; } catch { return false; }
  });
  const [contextoOpen, setContextoOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("dre-vis:contexto-open") === "1"; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem("dre-vis:filtros-salvos-open", filtrosSalvosOpen ? "1" : "0"); } catch {} }, [filtrosSalvosOpen]);
  useEffect(() => { try { localStorage.setItem("dre-vis:contexto-open", contextoOpen ? "1" : "0"); } catch {} }, [contextoOpen]);
  const [dataIni, setDataIni] = useState<string>(() => firstDayOfAnomes(ini));
  const [dataFim, setDataFim] = useState<string>(() => defaultDataFim(fim));
  useEffect(() => {
    setDataIni(firstDayOfAnomes(ini));
    setDataFim(defaultDataFim(fim));
  }, [ini, fim]);

  // Tipo de visão do Balanço: Mensal Fechado (E650SAL.SALMES) vs CCCC106 acumulado (E640LCT)
  const modoBalancoStorageKey = `dre.visualizacao.${id}.modoBalanco`;
  const [modoBalanco, setModoBalancoState] = useState<ModoBalanco>(() => {
    if (typeof window === "undefined") return "MENSAL_E650SAL";
    const saved = window.localStorage.getItem(modoBalancoStorageKey);
    // Migração: valor antigo PERIODO_CCCC106 → CCCC106_E640LCT_ACUMULADO
    if (saved === "PERIODO_CCCC106" || saved === "CCCC106_E640LCT_ACUMULADO") {
      return "CCCC106_E640LCT_ACUMULADO";
    }
    return "MENSAL_E650SAL";
  });
  const setModoBalanco = (m: ModoBalanco) => {
    setModoBalancoState(m);
    try { window.localStorage.setItem(modoBalancoStorageKey, m); } catch {}
  };
  const [dataCorte, setDataCorte] = useState<string>("");

  const { data: modelo } = useModelo(id);
  const tipoModelo = modelo?.modelo?.tipo_modelo;
  const isBalanco = tipoModelo === "BALANCO";
  const isConciliacaoSenior = isBalanco && modoBalanco === "CONCILIACAO_SENIOR_MENSAL";
  const modoBalancoEfetivo: ModoBalanco | undefined = isBalanco ? modoBalanco : undefined;
  const dataCorteEfetiva = isBalanco && modoBalanco === "CCCC106_E640LCT_ACUMULADO" ? dataCorte || null : null;
  const cccc106SemData = false;
  const { data: cfgContabil } = useContabilConfiguracao();
  const isModeloDREOficial = !!id && id === cfgContabil?.dre_modelo_padrao_id;
  const [confirmRecalcular, setConfirmRecalcular] = useState(false);

  // Toggle "Aplicar referência Senior" — controlado pela tela conforme nova regra.
  // Default true no Balanço Oficial (MENSAL_E650SAL) para preservar o fluxo NOGA validado.
  const refSeniorStorageKey = `dre.visualizacao.${id}.aplicarRefSenior`;
  const [aplicarRefSenior, setAplicarRefSeniorState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(refSeniorStorageKey);
    if (saved === "true") return true;
    if (saved === "false") return false;
    return true;
  });
  const setAplicarRefSenior = (v: boolean) => {
    setAplicarRefSeniorState(v);
    try { window.localStorage.setItem(refSeniorStorageKey, String(v)); } catch {}
  };

  // Toggle "Expandir resultado do exercício" — DEVE bater com o valor usado na
  // materialização, senão o snapshot não é encontrado (SEM_CACHE) e a grade
  // vem zerada. Default: ligado no Balanço Oficial (MENSAL_E650SAL) para casar
  // com o snapshot atual sem re-materializar.
  const expandirREStorageKey = `dre.visualizacao.${id}.expandirRE`;
  const [expandirRE, setExpandirREState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(expandirREStorageKey);
    if (saved === "true") return true;
    if (saved === "false") return false;
    return true;
  });
  const setExpandirRE = (v: boolean) => {
    setExpandirREState(v);
    try { window.localStorage.setItem(expandirREStorageKey, String(v)); } catch {}
  };


  // Balanço exige codfil específico — nunca "todas" — para não misturar
  // registros codfil=1 com codfil=null no resultado-cache.
  useEffect(() => {
    if (isBalanco && codfil === "todas") {
      setCodfil(String(CODFIL));
    }
  }, [isBalanco, codfil]);

  // codfil sempre numérico. Para Balanço nunca aceita "todas" (não misturar
  // codfil=1 com codfil=null no resultado-cache). Para DRE, "todas" cai no padrão CODFIL.
  const codfilNum: number = codfil === "todas" ? CODFIL : Number(codfil) || CODFIL;

  // tipo_modelo é sempre enviado; default DRE até carregar.
  const tipoModeloPayload: "DRE" | "BALANCO" = isBalanco ? "BALANCO" : "DRE";

  // Aplicar referência Senior só faz sentido no Balanço Oficial (MENSAL_E650SAL).
  const aplicarRefSeniorEfetivo =
    isBalanco && modoBalancoEfetivo === "MENSAL_E650SAL" ? aplicarRefSenior : false;
  // Expandir resultado do exercício: só entra no payload do Balanço Oficial
  // (Onde o backend usa o flag). Para DRE/demais modos vai false.
  const expandirREEfetivo =
    isBalanco && modoBalancoEfetivo === "MENSAL_E650SAL" ? expandirRE : false;

  const filtros = {
    anomes_ini: ini,
    anomes_fim: fim,
    codccu: codccu === "todos" ? undefined : codccu,
    codfil: codfilNum,
    tipo_modelo: tipoModeloPayload,
    modo_balanco: modoBalancoEfetivo,
    data_corte: dataCorteEfetiva,
    consolidado: false,
    aplicar_referencia_senior: aplicarRefSeniorEfetivo,
    expandir_resultado_exercicio: expandirREEfetivo,
    fonte_saldo: "E650SAL",
    unidade: unidade === "TODOS" ? undefined : unidade,
  };


  const { data: centros } = useCentrosCusto();
  const q = useResultadoPronto(id, filtros, !cccc106SemData && !isConciliacaoSenior);
  const materializar = useMaterializarResultado(id);
  // atualizarCacheSenior (sync) removido — o botão agora dispara materializar (job assíncrono).
  const [materJobId, setMaterJobId] = useState<string | null>(null);
  const [materOpen, setMaterOpen] = useState(false);
  const vincular = useVincularContasBalancoSenior(id);
  const qc = useQueryClient();

  const unidadeCaps = getUnidadeCapabilities(q.meta);
  const suportaFiltroUnidade = unidadeCaps.suportaFiltro;
  const mostrarFiltroUnidade = unidadeCaps.carregado && unidadeCaps.suportaFiltro;
  const onSuporteUnidadeChange = props.onSuporteUnidadeChange;
  const onCapabilitiesChange = props.onCapabilitiesChange;
  useEffect(() => {
    onSuporteUnidadeChange?.(suportaFiltroUnidade);
  }, [suportaFiltroUnidade, onSuporteUnidadeChange]);
  useEffect(() => {
    onCapabilitiesChange?.(unidadeCaps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onCapabilitiesChange,
    unidadeCaps.carregado,
    unidadeCaps.suportaFiltro,
    unidadeCaps.filtroIgnorado,
    unidadeCaps.motivo,
    unidadeCaps.regra,
    // lista de unidades: comparar por tamanho + primeiro código já é suficiente
    unidadeCaps.unidades.length,
    unidadeCaps.unidades[0]?.codigo,
  ]);
  // Reset defensivo: se o backend deixou de suportar (troca de período/modelo)
  // ou informou que ignorou o filtro, voltar a Consolidado.
  useEffect(() => {
    if (!unidadeCaps.carregado) return;
    if ((!unidadeCaps.suportaFiltro || unidadeCaps.filtroIgnorado) && unidade !== "TODOS") {
      setUnidade("TODOS");
    }
  }, [unidadeCaps.carregado, unidadeCaps.suportaFiltro, unidadeCaps.filtroIgnorado, unidade]);


  // ===== Presets de filtros salvos =====
  const currentPresetFilters: DreVisFilterPreset = {
    anoSelecionado, mesesVisiveis, codccu, codfil, visao,
    dataIni, dataFim, modoBalanco, dataCorte, aplicarRefSenior, expandirRE,
  };
  const applyPresetFilters = (f: DreVisFilterPreset) => {
    if (f.anoSelecionado != null) setAnoSelecionado(f.anoSelecionado);
    if (f.mesesVisiveis) setMesesVisiveis(f.mesesVisiveis);
    if (f.codccu != null) setCodccu(f.codccu);
    if (f.codfil != null) setCodfil(f.codfil);
    if (f.visao) setVisao(f.visao);
    if (f.dataIni) setDataIni(f.dataIni);
    if (f.dataFim) setDataFim(f.dataFim);
    if (f.modoBalanco) setModoBalanco(f.modoBalanco);
    if (f.dataCorte != null) setDataCorte(f.dataCorte);
    if (typeof f.aplicarRefSenior === "boolean") setAplicarRefSenior(f.aplicarRefSenior);
    if (typeof f.expandirRE === "boolean") setExpandirRE(f.expandirRE);
  };
  const presetHook = useFilterPresets<DreVisFilterPreset>(DRE_VIS_PAGE_KEY);
  const [presetsBootstrapped, setPresetsBootstrapped] = useState(false);
  useEffect(() => {
    if (presetsBootstrapped || presetHook.loading) return;
    setPresetsBootstrapped(true);
    const initial = presetHook.defaultPreset?.filtros ?? presetHook.lastFilters;
    if (initial) applyPresetFilters(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetHook.loading, presetHook.defaultPreset, presetHook.lastFilters]);
  useEffect(() => {
    if (!presetsBootstrapped) return;
    presetHook.saveLastFilters(currentPresetFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoSelecionado, mesesVisiveis, codccu, codfil, visao, dataIni, dataFim, modoBalanco, dataCorte, aplicarRefSenior, expandirRE]);





  const totalContas = modelo?.contas?.length ?? 0;
  const semContas = !!modelo && totalContas === 0;
  const filtrosComDatas: typeof filtros & { data_ini?: string; data_fim?: string } = isBalanco
    ? { ...filtros, data_ini: dataIni, data_fim: dataFim }
    : { ...filtros };
  const metodoCalculoLinhas = (q.data as any)?.metodo_calculo_linhas as
    | Record<string, string>
    | undefined;

  const resultadoFonteTecnicaPayload =
    q.meta?.fonte_saldo ??
    q.meta?.fonte ??
    q.data?.fonte_saldo ??
    q.data?.fonte ??
    null;
  const resultadoOrigemTecnica = q.meta?.origem ?? q.data?.origem ?? null;
  const resultadoFonteTecnica =
    resultadoFonteTecnicaPayload ??
    (isBalanco && modoBalancoEfetivo === "MENSAL_E650SAL" ? "E650SAL.SALMES" : null);
  const isBalancoMensalE650SAL =
    isBalanco &&
    modoBalancoEfetivo === "MENSAL_E650SAL" &&
    fonteEhE650Salmes(
      resultadoFonteTecnicaPayload,
      resultadoOrigemTecnica,
      q.data?.linhas?.[0]?.origem_valor,
    );
  const refSeniorSolicitada = aplicarRefSeniorEfetivo === true;
  const snapshotSemRefSenior =
    q.meta?.aplicar_referencia_senior === false ||
    q.data?.aplicar_referencia_senior === false ||
    q.meta?.referencia_senior_aplicada === false ||
    q.data?.referencia_senior_aplicada === false;
  const tipoExigeRefSenior =
    isBalanco && modoBalancoEfetivo === "MENSAL_E650SAL" && !isBalancoMensalE650SAL;
  const deveAvisarRefSeniorNaoAplicada =
    refSeniorSolicitada && snapshotSemRefSenior && tipoExigeRefSenior;


  const periodosApi: string[] = useMemo(
    () => (q.data?.periodos ?? (q.data?.colunas ?? []).filter((c: string) => !isTotalAnoCol(c))) as string[],
    [q.data],
  );
  const colunas: string[] = q.data?.colunas ?? [];


  // Status oficial de cache por mês (API)
  const periodosStatusQ = usePeriodosStatus({
    enabled: !isConciliacaoSenior,
    codfil: codfilNum,
    anomes_ini: ini,
    anomes_fim: fim,
    modo_balanco: isConciliacaoSenior ? undefined : modoBalancoEfetivo,
  });

  // Anomes único derivado de dataFim, usado pela visão Conciliação Senior x E650SAL.
  const anomesConciliacao = useMemo(() => {
    const [yy, mm] = (dataFim || "").split("-");
    const a = Number(yy) * 100 + Number(mm);
    return Number.isFinite(a) && a > 0 ? a : fim;
  }, [dataFim, fim]);

  const conciliacaoSenior = useConciliacaoSeniorMensal(
    {
      modelo_id: id,
      anomes: anomesConciliacao,
      codemp: modelo?.modelo?.codemp ?? 1,
      codfil: codfilNum,
    },
    isConciliacaoSenior,
  );
  const statusByAnomes = useMemo(() => {
    const m = new Map<string, PeriodoStatus>();
    for (const p of periodosStatusQ.data ?? []) m.set(String(p.anomes), p);
    return m;
  }, [periodosStatusQ.data]);

  const processadosSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of periodosStatusQ.data ?? []) {
      if (String(p.status).toUpperCase() === "PROCESSADO") s.add(String(p.anomes));
    }
    // Se a API de status estiver indisponível, considere períodos retornados pelo
    // /resultado-cache como processados (degradação graciosa).
    if (s.size === 0) for (const p of periodosApi) s.add(String(p));
    return s;
  }, [periodosStatusQ.data, periodosApi]);

  // Colunas mensais: ESTRITAMENTE os períodos retornados pela API em
  // `response.periodos`. Meses ausentes no cache não viram colunas — apenas
  // alimentam o banner "Cache incompleto". O filtro do usuário (mesesVisiveis)
  // apenas oculta meses já retornados; nunca adiciona meses que a API não trouxe.
  const colunasMensais: string[] = useMemo(() => {
    const mesesPermitidos = new Set(mesesVisiveis);
    return periodosApi
      .filter((p) => {
        const anomes = Number(p);
        if (!Number.isFinite(anomes)) return false;
        if (Math.floor(anomes / 100) !== anoSelecionado) return false;
        return mesesPermitidos.has(anomes % 100);
      })
      .slice()
      .sort((a, b) => Number(a) - Number(b));
  }, [periodosApi, mesesVisiveis, anoSelecionado]);
  const temTotalAno = false;
  const colunasVisiveis = colunasMensais;
  const mesesVisiveisCols = colunasMensais;

  // Meses solicitados pelo filtro que NÃO estão como PROCESSADO no cache.
  const mesesSemCache = useMemo(() => {
    const faltantes: number[] = [];
    for (const mes of mesesVisiveis) {
      const anomes = anoSelecionado * 100 + mes;
      if (!processadosSet.has(String(anomes))) faltantes.push(anomes);
    }
    return faltantes;
  }, [processadosSet, mesesVisiveis, anoSelecionado]);

  const labelTotalVisivel = isBalanco ? "Saldo final visível" : "Total visível";
  const calcTotalVisivel = (obj: Record<string, number | null> | undefined): number | null => {
    if (!mesesVisiveisCols.length) return null;
    if (isBalanco) {
      // Último mês visível com valor não-nulo.
      for (let i = mesesVisiveisCols.length - 1; i >= 0; i--) {
        const v = obj?.[mesesVisiveisCols[i]];
        if (v !== null && v !== undefined) return Number(v);
      }
      return null;
    }
    let acc = 0;
    let temAlgum = false;
    for (const c of mesesVisiveisCols) {
      const v = obj?.[c];
      if (v === null || v === undefined) continue;
      acc += Number(v);
      temAlgum = true;
    }
    return temAlgum ? acc : null;
  };

  // Acumulado = soma dos meses selecionados no filtro (mesma janela do
  // "Total visível"). Recalcula dinamicamente quando o usuário altera o
  // seletor de meses. Para Balanço, usa o último mês visível.
  const periodosAnoSnapshot = mesesVisiveisCols;
  const calcAcumuladoAno = (obj: Record<string, number | null> | undefined): number | null =>
    calcTotalVisivel(obj);

  // Colunas usadas SOMENTE na renderização da grid — inclui a coluna extra
  // "Acumulado" ao final. Exportações continuam usando `colunasVisiveis`.
  const colunasGrid: string[] = useMemo(
    () => (!isBalanco && colunasVisiveis.length > 0
      ? [...colunasVisiveis, "ACUMULADO_ANO"]
      : colunasVisiveis),
    [colunasVisiveis, isBalanco],
  );
  const labelAcumuladoAno = isBalanco ? "Saldo final do período" : "Acumulado";
  const tipAcumuladoAno = isBalanco
    ? "Saldo do último mês selecionado no filtro"
    : "Acumulado dos meses selecionados no filtro";

  // Linha 000 nunca é exibida na grade principal nem na exportação.
  // A pendência real é detectada via endpoint /diagnostico/ctared-zero e
  // mostrada em uma seção separada (PendenciasCtaredZeroPanel).

  // Consome a estrutura tal como retornada pela API — nenhum filtro por código.
  const linhasApi: ComparativoLinhaV2[] = q.data?.linhas ?? [];
  const linhas: ComparativoLinhaV2[] = useMemo(() => {
    if (linhasApi.length === 0) return linhasApi;
    const isBalanco = tipoModelo === "BALANCO";

    // 1) Separa apenas linhas técnicas do Balanço (000, 98, 999).
    //    99 (TOTAL DO PASSIVO + PL) e VINCULAR (Resultado do Exercício) ficam
    //    na árvore principal como linhas oficiais de Nível 1 vindas da API.
    const especiais000: ComparativoLinhaV2[] = [];
    const especiais98: ComparativoLinhaV2[] = [];
    const especiaisTot: ComparativoLinhaV2[] = [];
    const normais: ComparativoLinhaV2[] = [];
    for (const l of linhasApi) {
      // Filtrar linha placeholder "__PERSONALIZADO__ / Código personalizado".
      const codNorm = String(l.codigo ?? "").trim().toUpperCase();
      const descNorm = String(l.descricao ?? "").trim().toLowerCase();
      if (codNorm === "__PERSONALIZADO__" || descNorm === "código personalizado") continue;

      // DRE: ocultar a linha "9.9 Contas não classificadas" (e variações
      // "não classificado/classificada") para que não entre no resultado.
      if (!isBalanco) {
        const codLimpo = codNorm.replace(/\s+/g, "");
        const ehCod99 = codLimpo === "9.9" || codLimpo === "9.9." || codLimpo.startsWith("9.9.");
        const ehDescNaoClassificada =
          /n[aã]o\s+classificad[oa]s?/i.test(String(l.descricao ?? ""));
        if (ehCod99 || ehDescNaoClassificada) continue;
      }

      if (isBalanco && isLinhaTotalGeral(l)) especiaisTot.push(l);
      else if (isBalanco && isLinha98(l)) especiais98.push(l);
      else if (isBalanco && isLinha000(l)) especiais000.push(l);
      else normais.push(l);
    }

    // 1b) Reconciliar linhas virtuais (DRE expandida dentro do VINCULAR) usando
    //     `codigo_pai` (ou derivando do próprio `codigo` quando ausente). A API
    //     entrega `VINCULAR`, `VINCULAR.1`, `VINCULAR.1.1`, `VINCULAR.1.1.411...`
    //     sem `linha_pai_id` físico — montamos a hierarquia por código.
    const isVirtual = (l: ComparativoLinhaV2) =>
      l.origem_linha === "DRE_RESULTADO_EXERCICIO" ||
      l.linha_virtual === true ||
      String(l.codigo ?? "").startsWith("VINCULAR.");
    const vincular = normais.find(isLinhaVincular);
    if (vincular) {
      const byCodigo = new Map<string, ComparativoLinhaV2>();
      for (const l of normais) {
        const cod = String(l.codigo ?? "").trim();
        if (cod) byCodigo.set(cod, l);
      }
      const derivePai = (cod: string): string | null => {
        if (!cod || cod === "VINCULAR") return null;
        const idx = cod.lastIndexOf(".");
        return idx > 0 ? cod.slice(0, idx) : null;
      };
      for (const l of normais) {
        if (!isVirtual(l) || isLinhaVincular(l)) continue;
        const cod = String(l.codigo ?? "").trim();
        const codPai = (l.codigo_pai && String(l.codigo_pai).trim()) || derivePai(cod) || "VINCULAR";
        const pai = byCodigo.get(codPai) ?? vincular;
        l.linha_pai_id = pai.linha_id;
      }
    }

    // 1c) Reconciliar hierarquia numérica (DRE padrão): sublinhas `X.Y`, `X.Y.Z`
    //     devem ficar sob a linha pai `X` / `X.Y` quando o backend não envia
    //     `linha_pai_id`. Só aplica a códigos numéricos puros (evita colidir com
    //     `VINCULAR.*` do Balanço, já tratado em 1b).
    {
      const codNumRe = /^\d+(?:\.\d+)*$/;
      const idsAtuais = new Set(normais.map((l) => l.linha_id));
      const byCodigoNum = new Map<string, ComparativoLinhaV2>();
      for (const l of normais) {
        const cod = String(l.codigo ?? "").trim();
        if (cod && codNumRe.test(cod)) byCodigoNum.set(cod, l);
      }
      for (const l of normais) {
        const cod = String(l.codigo ?? "").trim();
        if (!cod || !codNumRe.test(cod)) continue;
        const temPaiValido = l.linha_pai_id && idsAtuais.has(l.linha_pai_id);
        if (temPaiValido) continue;
        const idx = cod.lastIndexOf(".");
        if (idx <= 0) continue;
        const codPai = cod.slice(0, idx);
        const pai = byCodigoNum.get(codPai);
        if (pai && pai.linha_id !== l.linha_id) {
          l.linha_pai_id = pai.linha_id;
        }
      }
    }




    // 2) Monta árvore por linha_pai_id; ordena irmãos por `ordem`.
    const idsNormais = new Set(normais.map((l) => l.linha_id));
    const filhosPorPai = new Map<string | null, ComparativoLinhaV2[]>();
    for (const l of normais) {
      const pai =
        l.linha_pai_id && idsNormais.has(l.linha_pai_id) ? l.linha_pai_id : null;
      const arr = filhosPorPai.get(pai) ?? [];
      arr.push(l);
      filhosPorPai.set(pai, arr);
    }

    const codNumSortRe = /^\d+(?:\.\d+)*$/;
    const sortSiblings = (arr: ComparativoLinhaV2[]) =>
      arr.sort((a, b) => {
        // Para virtuais (filhas de VINCULAR), ordenar por `codigo` natural
        // (1, 1.1, 411010001, 2, ...). Para o restante, `ordem` é autoritativo.
        const av = isVirtual(a);
        const bv = isVirtual(b);
        if (av && bv) {
          return String(a.codigo ?? "").localeCompare(String(b.codigo ?? ""), undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
        // Códigos puramente numéricos (1, 2, ..., 9, 10, 7.1, 8.2): ordem natural
        // por código evita a ordenação lexicográfica "1, 10, 2".
        const ca = String(a.codigo ?? "").trim();
        const cb = String(b.codigo ?? "").trim();
        if (codNumSortRe.test(ca) && codNumSortRe.test(cb)) {
          return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: "base" });
        }
        const oa = Number(a.ordem ?? 0);
        const ob = Number(b.ordem ?? 0);
        if (oa !== ob) return oa - ob;
        return String(a.codigo ?? a.linha_id).localeCompare(String(b.codigo ?? b.linha_id));
      });

    for (const arr of filhosPorPai.values()) sortSiblings(arr);

    // 3) DFS: pai → filhos (recursivo).
    const out: ComparativoLinhaV2[] = [];
    const visitados = new Set<string>();
    const visit = (l: ComparativoLinhaV2) => {
      if (visitados.has(l.linha_id)) return;
      visitados.add(l.linha_id);
      out.push(l);
      const filhos = filhosPorPai.get(l.linha_id);
      if (filhos) for (const f of filhos) visit(f);
    };
    for (const r of filhosPorPai.get(null) ?? []) visit(r);

    // 4) Safety: anexa qualquer linha órfã não alcançada pela travessia.
    if (out.length < normais.length) {
      for (const l of normais) if (!visitados.has(l.linha_id)) out.push(l);
    }

    // 5) Ordem final: árvore (com 99 e VINCULAR como Nível 1) → 000 → 98 → 999.
    return [
      ...out,
      ...especiais000,
      ...especiais98,
      ...especiaisTot,
    ];
  }, [linhasApi, tipoModelo]);

  const ultimaLinha = linhas[linhas.length - 1];
  const balancoIncompleto =
    tipoModelo === "BALANCO" &&
    linhas.length > 0 &&
    !String(ultimaLinha?.codigo ?? "").startsWith("9") &&
    !isLinhaTotalGeral(ultimaLinha);
  const balancoSemVincular =
    tipoModelo === "BALANCO" &&
    linhas.length > 0 &&
    !linhas.some(isLinhaVincular);

  const linhaTotalGeral = useMemo(() => linhas.find(isLinhaTotalGeral), [linhas]);
  const balancoComDiferenca = useMemo(() => {
    if (tipoModelo !== "BALANCO" || !linhaTotalGeral) return false;
    const soma = mesesVisiveisCols.reduce(
      (acc, c) => acc + Number(linhaTotalGeral.realizado?.[c] ?? 0),
      0,
    );
    return Math.abs(soma) > 0.01;
  }, [tipoModelo, linhaTotalGeral, mesesVisiveisCols]);



  const confirmarSemContas = () =>
    !semContas ||
    window.confirm(
      "Este modelo não possui contas vinculadas. Deseja recalcular mesmo assim?",
    );

  const toastResultadoCache = (
    r: { execucao_id?: string; status?: string; mensagem?: string } | null | undefined,
    fallback: string,
  ) => {
    const parts: string[] = [];
    if (r?.status) parts.push(`status ${r.status}`);
    if (r?.execucao_id) parts.push(`execução ${r.execucao_id}`);
    toast.success(parts.length ? `${fallback} — ${parts.join(" · ")}` : fallback);
  };

  // Dispara materialização assíncrona do snapshot pronto e abre o modal de progresso.
  const dispararMaterializacao = async (filtrosUsados = filtrosComDatas) => {
    if (!confirmarSemContas()) return;
    try {
      const r = await materializar.mutateAsync(filtrosUsados);
      if (r?.job_id) {
        setMaterJobId(r.job_id);
        setMaterOpen(true);
      } else {
        // API concluiu sem job — apenas recarrega.
        await qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto", id] });
        toast.success("Resultado atualizado.");
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Falha ao iniciar materialização.");
    }
  };

  const handleSincronizar = () => dispararMaterializacao();
  const handleRecalcular = () => dispararMaterializacao();
  const handleGerarResultado = () => dispararMaterializacao();
  // Legado: o passo "Atualizar cache Senior" era síncrono e estourava o timeout de 15s
  // do contabilApi. O fluxo assíncrono materializar-resultado (job + polling) já faz
  // sync do ERP + recálculo dentro do próprio job, então redirecionamos para lá.
  const handleAtualizarCacheSenior = () => dispararMaterializacao();
  const handleRecarregar = async () => {
    toast.info("Recarregando resultado...");
    await qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto", id] });
    q.refetch();
  };

  // ===== Executar tudo automaticamente =====
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoStep, setAutoStep] = useState<null | "vincular" | "gerar">(null);
  const autoRunLockRef = useRef(false);
  const autoTriggeredKeyRef = useRef<string | null>(null);

  const executarTudoAutomatico = async (opts?: { silent?: boolean }) => {
    if (autoRunLockRef.current) return;
    autoRunLockRef.current = true;
    setAutoRunning(true);
    try {
      if (semContas) {
        setAutoStep("vincular");
        if (!opts?.silent) toast.info("Passo 1/2 · Vinculando contas do plano Senior...");
        await vincular.mutateAsync();
      }
      setAutoStep("gerar");
      if (!opts?.silent) {
        toast.info(
          semContas
            ? "Passo 2/2 · Gerando resultado (sync ERP + recálculo)..."
            : "Gerando resultado (sync ERP + recálculo)...",
        );
      }
      const r = await materializar.mutateAsync(filtrosComDatas);
      if (r?.job_id) {
        setMaterJobId(r.job_id);
        setMaterOpen(true);
      } else {
        await qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto", id] });
      }
      toast.success("Processo automático concluído.");
    } catch (e) {
      toast.error(`Processo automático interrompido: ${(e as Error)?.message ?? "erro"}`);
    } finally {
      setAutoStep(null);
      setAutoRunning(false);
      autoRunLockRef.current = false;
    }
  };

  // Auto-disparo ao entrar na tela sem cache/sem contas (uma vez por combinação).
  useEffect(() => {
    if (!modelo || q.isLoading) return;
    const semCache = q.meta?.status === "SEM_CACHE";
    if (!semContas && !semCache) return;
    const key = `${id}|${ini}|${fim}|${codfilNum}|${modoBalancoEfetivo ?? ""}`;
    if (autoTriggeredKeyRef.current === key) return;
    autoTriggeredKeyRef.current = key;
    const t = setTimeout(() => { executarTudoAutomatico({ silent: false }); }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelo, q.isLoading, q.meta?.status, semContas, id, ini, fim, codfilNum, modoBalancoEfetivo]);

  const handleCarregarAnoInteiro = () => {
    const ano = anoSelecionado;
    const iniAno = ano * 100 + 1;
    const fimAno = ano * 100 + 12;
    setMesesVisiveis([1,2,3,4,5,6,7,8,9,10,11,12]);
    const filtrosAno = {
      ...filtros,
      anomes_ini: iniAno,
      anomes_fim: fimAno,
      tipo_modelo: tipoModeloPayload,
      ...(isBalanco
        ? { data_ini: firstDayOfAnomes(iniAno), data_fim: defaultDataFim(fimAno) }
        : {}),
    };
    return dispararMaterializacao(filtrosAno);
  };

  // Compat: silenciar utilitários legados não usados após migração para resultado-pronto.
  void toastResultadoCache;







  const { depthMap, childrenMap, byId } = useMemo(() => {
    const m = new Map<string, number>();
    const byIdLocal = new Map(linhas.map((l) => [l.linha_id, l]));
    const childrenLocal = new Map<string, string[]>();
    for (const l of linhas) {
      if (l.linha_pai_id) {
        const arr = childrenLocal.get(l.linha_pai_id) ?? [];
        arr.push(l.linha_id);
        childrenLocal.set(l.linha_pai_id, arr);
      }
    }
    function depth(l: ComparativoLinhaV2): number {
      if (m.has(l.linha_id)) return m.get(l.linha_id)!;
      const d = l.linha_pai_id && byIdLocal.has(l.linha_pai_id)
        ? depth(byIdLocal.get(l.linha_pai_id)!) + 1
        : 0;
      m.set(l.linha_id, d);
      return d;
    }
    linhas.forEach(depth);
    return { depthMap: m, childrenMap: childrenLocal, byId: byIdLocal };
  }, [linhas]);

  const contasPorLinha = useMemo(() => {
    const map = new Map<string, ContaVinculada[]>();
    for (const c of modelo?.contas ?? []) {
      const arr = map.get(c.linha_id) ?? [];
      arr.push(c);
      map.set(c.linha_id, arr);
    }
    return map;
  }, [modelo]);

  const handleExportarExcel = async () => {
    try {
      // Gate oficial: exportar somente quando o snapshot é a fonte oficial
      // (Balanço MENSAL_E650SAL com referência Senior aplicada, ou DRE oficial).
      // Fallback: se a API não expõe `fonte_oficial`, mantém compatibilidade
      // com a regra anterior de referência Senior.
      const fonteOficial = q.meta?.fonte_oficial;
      if (fonteOficial === false) {
        toast.error(
          "Este resultado não é oficial. Clique em Atualizar Resultado antes de exportar.",
        );
        return;
      }
      if (fonteOficial == null && deveAvisarRefSeniorNaoAplicada) {
        toast.error(
          "Referência Senior não aplicada neste resultado. Clique em Atualizar Resultado antes de exportar.",
        );
        return;
      }
      const XLSX = await import("xlsx");
      const fmtNum = (n: number | null | undefined): number | string => {
        if (n === null || n === undefined) return "";
        return semCasasDecimais ? arredondarComercial(n) : n;
      };


      let rows: Array<Record<string, string | number>>;
      if (modo === "NIVEL3") {
        if (!resultadoNivel3.length) {
          toast.error("Não há dados para exportar.");
          return;
        }
        rows = [];
        const naturezasOrdenadas = Array.from(totaisNivel3.porNatureza.keys()).sort();
        for (const natureza of naturezasOrdenadas) {
          for (const g of resultadoNivel3.filter((x) => x.natureza === natureza)) {
            const row: Record<string, string | number> = {
              "Natureza": natureza,
              "Código Nível 3": g.codigo,
              "Descrição": g.descricao,
            };
            for (const c of colunasVisiveis) {
              const label = isTotalAnoCol(c) ? labelTotalVisivel : formatAnomes(c);
              row[label] = fmtNum(isTotalAnoCol(c) ? calcTotalVisivel(g.valores) : (g.valores[c] ?? null));
            }
            rows.push(row);
          }
          const totNat = totaisNivel3.porNatureza.get(natureza)!;
          const row: Record<string, string | number> = {
            "Natureza": natureza,
            "Código Nível 3": "",
            "Descrição": `TOTAL ${natureza}`,
          };
          for (const c of colunasVisiveis) {
            const label = isTotalAnoCol(c) ? labelTotalVisivel : formatAnomes(c);
            row[label] = fmtNum(isTotalAnoCol(c) ? calcTotalVisivel(totNat.valores) : (totNat.valores[c] ?? null));
          }
          rows.push(row);
        }
        const rowTot: Record<string, string | number> = {
          "Natureza": "",
          "Código Nível 3": "",
          "Descrição": "TOTAL GERAL",
        };
        for (const c of colunasVisiveis) {
          const label = isTotalAnoCol(c) ? labelTotalVisivel : formatAnomes(c);
          rowTot[label] = fmtNum(isTotalAnoCol(c)
            ? calcTotalVisivel(totaisNivel3.totalGeral.valores)
            : (totaisNivel3.totalGeral.valores[c] ?? null));
        }
        rows.push(rowTot);
      } else {
        if (!linhasFiltradas.length) {
          toast.error("Não há dados para exportar.");
          return;
        }
          rows = linhasFiltradas
            .filter((l) => {
              // Linha 000 e demais técnicas do Balanço só aparecem com o toggle.
              if (isBalanco && isLinhaTecnicaBalanco(l)) {
                return mostrarTecnicas;
              }
              if (isBalanco && nivelExibido === 1) {
                return isNivel1Balanco(l);
              }
              return true;
            })

          .map((l) => {
          const cs = contasPorLinha.get(l.linha_id) ?? [];
          const isVirtual = l.linha_virtual === true;
          const classificacao = isVirtual
            ? String(l.codigo_exibicao || l.conta_contabil || l.codigo || "").trim()
            : cs.length === 0
              ? (l.codigo ?? "")
              : formatarCampoContasExcel(cs, "clacta");
          const descricao = isVirtual
            ? String(l.descricao_conta || l.descricao || l.descricao_linha || "")
            : (l.descricao ?? "");
          let contaContabil: string;
          if (isVirtual) {
            const ctared = l.conta_reduzida;
            contaContabil =
              ctared === null || ctared === undefined || String(ctared).trim() === ""
                ? "-"
                : String(ctared);
          } else {
            contaContabil = cs.length === 0 ? "-" : formatarCampoContasExcel(cs, "ctared");
          }
          const row: Record<string, string | number> = {
            "Classificação Contábil": classificacao,
            "Descrição": descricao,
            "Conta Contábil": contaContabil,
            "Tipo": (l.tipo_registro as string) ?? l.tipo_linha ?? "",
            "Natureza": l.natureza ?? "",
          };
          for (const c of colunasVisiveis) {
            const label = isTotalAnoCol(c) ? labelTotalVisivel : formatAnomes(c);
            const raw = isTotalAnoCol(c)
              ? calcTotalVisivel(l.realizado as Record<string, number | null> | undefined)
              : (l.realizado?.[c] ?? null);
            row[label] = fmtNum(raw);
          }

          return row;
        });

      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Visualizacao");

      // Aba de metadados — reflete EXATAMENTE o payload exibido na tela.
      const metaRows: Array<Record<string, string | number>> = [
        { Campo: "Modelo", Valor: modelo?.modelo?.nome ?? "—" },
        { Campo: "Tipo", Valor: tipoModeloPayload },
        { Campo: "Modo Balanço", Valor: modoBalancoEfetivo ?? "—" },
        { Campo: "Período", Valor: `${ini} a ${fim}` },
        { Campo: "Empresa (codemp)", Valor: String(modelo?.modelo?.codemp ?? 1) },
        { Campo: "Filial (codfil)", Valor: String(codfilNum) },
        {
          Campo: "aplicar_referencia_senior",
          Valor: filtros.aplicar_referencia_senior ? "true" : "false",
        },
        {
          Campo: "expandir_resultado_exercicio",
          Valor: filtros.expandir_resultado_exercicio ? "true" : "false",
        },
        {
          Campo: "Referência Senior aplicada",
          Valor:
            q.meta?.referencia_senior_aplicada === true
              ? "Sim"
              : q.meta?.referencia_senior_aplicada === false
                ? "Não"
                : "—",
        },
        { Campo: "Origem Referência", Valor: q.meta?.referencia_senior_origem ?? "—" },
        { Campo: "Qtd. referências aplicadas", Valor: q.meta?.qtd_referencias_aplicadas ?? "—" },
        { Campo: "Fonte técnica", Valor: resultadoFonteTecnica ?? "—" },
        { Campo: "Fonte de saldo", Valor: q.meta?.fonte_saldo ?? "E650SAL" },
        {
          Campo: "Fonte oficial",
          Valor:
            q.meta?.fonte_oficial === true
              ? "Sim"
              : q.meta?.fonte_oficial === false
                ? "Não"
                : "—",
        },
        {
          Campo: "Última atualização",
          Valor: q.meta?.ultima_atualizacao ?? q.meta?.atualizado_em
            ? new Date(
                (q.meta?.ultima_atualizacao ?? q.meta?.atualizado_em) as string,
              ).toLocaleString("pt-BR")
            : "—",
        },
        { Campo: "Origem do resultado", Valor: q.meta?.origem ?? "—" },
      ];
      const wsMeta = XLSX.utils.json_to_sheet(metaRows);
      XLSX.utils.book_append_sheet(wb, wsMeta, "Metadados");

      const slug = (modelo?.modelo?.nome ?? "modelo")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_") || "modelo";
      XLSX.writeFile(wb, `${slug}_${ini}_${fim}.xlsx`);
      toast.success("Excel exportado com sucesso.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar Excel.");
    }
  };


  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [nivelExibido, setNivelExibido] = useState<number | "todos">("todos");
  const [modo, setModo] = useState<Modo>("SINTETICO");
  const [buscaGrid, setBuscaGrid] = useState("");
  const [filtroNatureza, setFiltroNatureza] = useState("TODAS");
  const [filtroTipoLinha, setFiltroTipoLinha] = useState("TODOS");
  const [filtroValor, setFiltroValor] = useState("TODOS");
  const [filtroConta, setFiltroConta] = useState("TODAS");
  const [mostrarTecnicas, setMostrarTecnicas] = useState<boolean>(false);
  const [semCasasDecimais, setSemCasasDecimais] = useState<boolean>(false);
  const sinteticoInitKeyRef = useRef("");
  useEffect(() => {
    setCollapsed(new Set());
    setNivelExibido("todos");
    setModo("SINTETICO");
    setBuscaGrid("");
    setFiltroNatureza("TODAS");
    setFiltroTipoLinha("TODOS");
    setFiltroValor("TODOS");
    setFiltroConta("TODAS");
    setMesesVisiveis([1,2,3,4,5,6,7,8,9,10,11,12]);
  }, [id]);


  useEffect(() => {
    if (modo === "ANALITICO") {
      setCollapsed(new Set());
      setNivelExibido("todos");
    }
  }, [modo]);

  // Ao entrar em SINTETICO na DRE, começa com os pais diretos de linhas
  // ANALITICAS recolhidos. A árvore sintética fica visível nas classificações,
  // e o chevron do pai revela/recolhe seus analíticos.
  useEffect(() => {
    if (modo !== "SINTETICO" || isBalanco) {
      sinteticoInitKeyRef.current = "";
      return;
    }

    const initKey = [
      id,
      tipoModelo,
      linhas.length,
      linhas[0]?.linha_id ?? "",
      linhas[linhas.length - 1]?.linha_id ?? "",
    ].join("|");
    if (sinteticoInitKeyRef.current === initKey) return;
    sinteticoInitKeyRef.current = initKey;

    const next = new Set<string>();
    let nivelMaisRaso: number | null = null;

    for (const [parentId, childIds] of childrenMap.entries()) {
      const temFilhoAnalitico = childIds.some(
        (childId) => byId.get(childId)?.tipo_linha === "ANALITICA",
      );
      if (!temFilhoAnalitico) continue;

      next.add(parentId);
      const depthPai = depthMap.get(parentId) ?? 0;
      if (nivelMaisRaso === null || depthPai < nivelMaisRaso) {
        nivelMaisRaso = depthPai;
      }
    }

    setCollapsed(next);
    setNivelExibido(nivelMaisRaso === null ? "todos" : nivelMaisRaso + 1);
  }, [modo, isBalanco, childrenMap, byId, depthMap]);

  const semAnaliticas = useMemo(
    () => linhas.length > 0 && linhas.every((l) => l.tipo_linha !== "ANALITICA"),
    [linhas],
  );

  const filtrosAtivos =
    buscaGrid.trim() !== "" ||
    filtroNatureza !== "TODAS" ||
    filtroTipoLinha !== "TODOS" ||
    filtroValor !== "TODOS" ||
    filtroConta !== "TODAS";

  const linhasFiltradas = useMemo(() => {
    if (!filtrosAtivos) return linhas;
    const termo = buscaGrid.trim().toLowerCase();
    const EPS = 0.004;
    return linhas.filter((l) => {
      if (isLinhaEspecial(l)) return true;
      const cs = contasPorLinha.get(l.linha_id) ?? [];

      if (termo) {
        const textoContas = cs
          .map((c) => [c.ctared, c.clacta, c.descta].filter(Boolean).join(" "))
          .join(" ");
        const texto = [l.codigo, l.descricao, l.tipo_linha, l.natureza, textoContas]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!texto.includes(termo)) return false;
      }
      if (filtroNatureza !== "TODAS" && (l.natureza ?? "").toUpperCase() !== filtroNatureza) return false;
      if (filtroTipoLinha !== "TODOS" && (l.tipo_linha ?? "").toUpperCase() !== filtroTipoLinha) return false;
      if (filtroValor !== "TODOS") {
        // Considera somente os meses/períodos efetivamente visíveis na grade.
        // Usa tolerância EPS para tratar 0,00 / null / undefined / vazio como zero,
        // e não soma os meses (linhas com +100/-100 contam como COM_VALOR).
        let temValor = false;
        let algumPositivo = false;
        let algumNegativo = false;
        for (const c of mesesVisiveisCols) {
          const raw = l.realizado?.[c];
          if (raw == null) continue;
          const v = Number(raw);
          if (!Number.isFinite(v)) continue;
          if (Math.abs(v) > EPS) {
            temValor = true;
            if (v > EPS) algumPositivo = true;
            if (v < -EPS) algumNegativo = true;
          }
        }
        if (filtroValor === "COM_VALOR" && !temValor) return false;
        if (filtroValor === "SEM_VALOR" && temValor) return false;
        if (filtroValor === "POSITIVAS" && !algumPositivo) return false;
        if (filtroValor === "NEGATIVAS" && !algumNegativo) return false;
      }
      if (filtroConta === "COM_CONTA" && cs.length === 0) return false;
      if (filtroConta === "SEM_CONTA" && cs.length > 0) return false;
      return true;
    });
  }, [linhas, mesesVisiveisCols, contasPorLinha, filtrosAtivos, buscaGrid, filtroNatureza, filtroTipoLinha, filtroValor, filtroConta]);

  const idsComAncestrais = useMemo(() => {
    const set = new Set<string>();
    for (const l of linhasFiltradas) {
      set.add(l.linha_id);
      let cur = l.linha_pai_id;
      while (cur && !set.has(cur)) {
        set.add(cur);
        cur = byId.get(cur)?.linha_pai_id ?? null;
      }
    }
    return set;
  }, [linhasFiltradas, byId]);

  const limparFiltros = () => {
    setBuscaGrid("");
    setFiltroNatureza("TODAS");
    setFiltroTipoLinha("TODOS");
    setFiltroValor("TODOS");
    setFiltroConta("TODAS");
    
  };

  const resultadoNivel3 = useMemo<GrupoNivel3[]>(() => {
    const mapa = new Map<string, GrupoNivel3>();
    const linhasVisiveis = linhas.filter((l) => l.exibir !== false);

    for (const linha of linhasVisiveis) {
      const codigoNivel3 = getCodigoNivel3(linha);
      if (!codigoNivel3) continue;

      const natureza = (linha.natureza ?? "OUTROS").toString().toUpperCase();
      const chave = `${natureza}|${codigoNivel3}`;

      if (!mapa.has(chave)) {
        const linhaNivel3 = linhasVisiveis.find(
          (l) => String(l.codigo ?? "").replace(/\D/g, "") === codigoNivel3,
        );
        const valores: Record<string, number> = {};
        for (const c of colunas) valores[c] = 0;
        mapa.set(chave, {
          natureza,
          codigo: codigoNivel3,
          descricao: linhaNivel3?.descricao ?? linha.descricao ?? "",
          valores,
          total: 0,
        });
      }

      const grupo = mapa.get(chave)!;
      for (const c of colunas) {
        grupo.valores[c] += Number(linha.realizado?.[c] ?? 0);
      }
    }

    for (const grupo of mapa.values()) {
      grupo.total = colunas
        .filter((c) => !isTotalAnoCol(c))
        .reduce((acc, c) => acc + Number(grupo.valores[c] ?? 0), 0);
    }

    return Array.from(mapa.values()).sort((a, b) => {
      if (a.natureza !== b.natureza) return a.natureza.localeCompare(b.natureza);
      return a.codigo.localeCompare(b.codigo);
    });
  }, [linhas, colunas]);

  const totaisNivel3 = useMemo(() => {
    const porNatureza = new Map<string, { valores: Record<string, number>; total: number }>();
    const totalGeral: { valores: Record<string, number>; total: number } = {
      valores: Object.fromEntries(colunas.map((c) => [c, 0])),
      total: 0,
    };
    for (const g of resultadoNivel3) {
      if (!porNatureza.has(g.natureza)) {
        porNatureza.set(g.natureza, {
          valores: Object.fromEntries(colunas.map((c) => [c, 0])),
          total: 0,
        });
      }
      const acc = porNatureza.get(g.natureza)!;
      for (const c of colunas) {
        acc.valores[c] += g.valores[c] ?? 0;
        totalGeral.valores[c] += g.valores[c] ?? 0;
      }
      acc.total += g.total;
      totalGeral.total += g.total;
    }
    return { porNatureza, totalGeral };
  }, [resultadoNivel3, colunas]);





  const maxDepth = useMemo(
    () => linhas.reduce((m, l) => {
      if (isLinhaEspecial(l)) return m;
      return Math.max(m, depthMap.get(l.linha_id) ?? 0);
    }, 0),
    [linhas, depthMap],
  );

  const hasChildren = (lid: string) => (childrenMap.get(lid)?.length ?? 0) > 0;
  const toggleCollapse = (lid: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(lid)) n.delete(lid); else n.add(lid);
      return n;
    });
  const isHiddenByAncestor = (l: ComparativoLinhaV2) => {
    let cur = l.linha_pai_id;
    while (cur) {
      if (collapsed.has(cur)) return true;
      cur = byId.get(cur)?.linha_pai_id ?? null;
    }
    return false;
  };
  const isHiddenByAncestorAcimaDoPai = (l: ComparativoLinhaV2) => {
    let cur = l.linha_pai_id ? byId.get(l.linha_pai_id)?.linha_pai_id ?? null : null;
    while (cur) {
      if (collapsed.has(cur)) return true;
      cur = byId.get(cur)?.linha_pai_id ?? null;
    }
    return false;
  };
  const aplicarNivel = (nivel: number | "todos") => {
    setNivelExibido(nivel);
    if (nivel === "todos") {
      setCollapsed(new Set());
      return;
    }
    const next = new Set<string>();
    for (const l of linhas) {
      const d = depthMap.get(l.linha_id) ?? 0;
      if (d >= nivel - 1 && hasChildren(l.linha_id)) next.add(l.linha_id);
    }
    setCollapsed(next);
  };
  const expandirTudo = () => aplicarNivel("todos");
  const recolherTudo = () => aplicarNivel(1);

  const filiais = useMemo(() => {
    // Lista mínima: filial atual. Para mais filiais, integrar endpoint específico.
    return [{ codfil: CODFIL, nome: `Filial ${CODFIL}` }];
  }, []);

  const openDrill = (linha: ComparativoLinhaV2, col: string) => {
    const isTotalAno = isTotalAnoCol(col);
    // Resolve conta analítica (ctared):
    // - linha virtual (DRE expandida dentro de VINCULAR): usa `conta_reduzida`
    // - linha normal com EXATAMENTE 1 conta vinculada: usa a ctared dela
    let ctared: number | string | null = null;
    if (linha.linha_virtual === true) {
      ctared = linha.conta_reduzida ?? null;
    } else {
      const cs = contasPorLinha.get(linha.linha_id) ?? [];
      if (cs.length === 1) ctared = cs[0].ctared;
    }
    // Se não é analítica, tenta drill por classificação (grupo sintético).
    let clacta: string | null = null;
    if (ctared == null) {
      const tipoReg = String(linha.tipo_registro ?? "").toUpperCase();
      const ehGrupo =
        tipoReg === "GRUPO" ||
        tipoReg === "SUBTOTAL" ||
        tipoReg === "TOTAL" ||
        linha.tipo_linha === "GRUPO" ||
        linha.tipo_linha === "SUBTOTAL" ||
        linha.tipo_linha === "TOTAL";
      if (ehGrupo) {
        const candidato =
          linha.codigo_exibicao ??
          linha.conta_contabil ??
          linha.codigo ??
          null;
        clacta = candidato ? String(candidato).trim() || null : null;
      }
    }
    // Escolhe janela: coluna mensal → anomes; TOTAL_ANO/ACUMULADO_ANO → intervalo do ano.
    const isAcumAno = isAcumuladoAnoCol(col);
    const isAgregado = isTotalAno || isAcumAno;
    const anomes = !isAgregado ? Number(col) : undefined;
    let anomes_ini: number | undefined;
    let anomes_fim: number | undefined;
    if (isAcumAno && periodosAnoSnapshot.length > 0) {
      anomes_ini = Number(periodosAnoSnapshot[0]);
      anomes_fim = Number(periodosAnoSnapshot[periodosAnoSnapshot.length - 1]);
    } else if (isTotalAno) {
      anomes_ini = ini;
      anomes_fim = fim;
    }
    if (!isAgregado && !Number.isFinite(anomes as number)) return;
    setDrill({
      modeloId: id,
      linhaId: linha.linha_id,
      linhaDescricao: linha.descricao,
      anomes,
      anomes_ini,
      anomes_fim,
      codemp: modelo?.modelo?.codemp ?? 1,
      codfil: codfilNum,
      ctared,
      clacta,
    });
  };

  const renderSingleCell = (l: ComparativoLinhaV2, col: string) => {
    const isTotalAno = isTotalAnoCol(col);
    const isAcumAno = isAcumuladoAnoCol(col);
    const isAgregado = isTotalAno || isAcumAno;
    const variant = visao === "VARP" ? "pct" : "money";
    const canDrill = visao === "REAL";
    let v: number | null;
    if (isAgregado) {
      if (visao === "VARP") {
        v = null;
      } else {
        const campo: "realizado"|"orcado"|"variacao" =
          visao === "ORC" ? "orcado" : visao === "VARV" ? "variacao" : "realizado";
        const obj = l[campo] as Record<string, number | null> | undefined;
        v = isAcumAno ? calcAcumuladoAno(obj) : calcTotalVisivel(obj);
      }
    } else {
      v = pickValue(l, visao, col);
    }
    return (
      <td key={col} className={cn("border-l", isTotalAno && "bg-slate-100", isAcumAno && "bg-sky-50")}>
        <MoneyCell
          value={v}
          variant={variant}
          emptyAs="dash"

          onClick={canDrill ? () => openDrill(l, col) : undefined}
        />
      </td>
    );
  };

  const renderCompCell = (l: ComparativoLinhaV2, col: string) => {
    const isTotalAno = isTotalAnoCol(col);
    const isAcumAno = isAcumuladoAnoCol(col);
    const isAgregado = isTotalAno || isAcumAno;
    return (
      <td key={col} className={cn("border-l px-0", isTotalAno && "bg-slate-100", isAcumAno && "bg-sky-50")}>
        <div className="grid grid-cols-4 gap-0">
          {SUB_COLS.map((sc) => {
            let v: number | null;
            if (isAgregado) {
              const obj = l[sc.key] as Record<string, number | null> | undefined;
              v = sc.pct ? null : (isAcumAno ? calcAcumuladoAno(obj) : calcTotalVisivel(obj));
            } else {
              v = (l[sc.key] as Record<string, number | null>)?.[col] ?? null;
            }
            const canDrill = sc.key === "realizado";
            return (
              <MoneyCell
                key={sc.key}
                value={v}
                variant={sc.pct ? "pct" : "money"}
                emptyAs="dash"

                onClick={canDrill ? () => openDrill(l, col) : undefined}
              />
            );
          })}
        </div>
      </td>
    );
  };

  return (
    <MoneyDisplayProvider noCents={semCasasDecimais}>
    <div className="p-6">
      {!modoBloqueado && (
      <div className="mb-3 rounded-xl border bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setFiltrosSalvosOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-slate-50 rounded-t-xl"
        >
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Filtros salvos</span>
          <span className="flex items-center gap-2 text-xs text-slate-600">
            {!filtrosSalvosOpen && <span className="truncate max-w-[400px]">Clique para gerenciar presets</span>}
            {filtrosSalvosOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </button>
        {filtrosSalvosOpen && (
          <div className="px-3 pb-3">
            <FilterPresetBar<DreVisFilterPreset>
              pageKey={DRE_VIS_PAGE_KEY}
              currentFilters={currentPresetFilters}
              onApply={applyPresetFilters}
            />
          </div>
        )}
      </div>
      )}
      {deveAvisarRefSeniorNaoAplicada && !!q.data && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1">
              Referência Senior não aplicada neste modelo de Balanço — os
              valores podem divergir do relatório oficial. Cadastre a
              referência Senior para este modelo.
            </div>
          </div>
        )}
      {(() => {
        const semCache = q.meta?.status === "SEM_CACHE";
        const mostrarStepper = semContas || semCache;
        if (!mostrarStepper) return null;

        const passoAtual = semContas ? 1 : semCache ? 2 : 3;
        const feito = (n: number) => n < passoAtual;
        const atual = (n: number) => n === passoAtual;

        const passos: Array<{
          num: number;
          titulo: string;
          desc: string;
          botao: string;
          icone: ReactNode;
          onClick?: () => void;
          disabled?: boolean;
          loading?: boolean;
          mostrar: boolean;
        }> = [
          {
            num: 1,
            titulo: "Vincular contas",
            desc: "Lê o plano Senior e cria as linhas analíticas do modelo. Faça só na 1ª vez ou quando o plano mudar. Pode levar até 1 min.",
            botao: vincular.isPending ? "Vinculando..." : "Vincular contas",
            icone: <Link2 className="h-4 w-4" />,
            onClick: () => vincular.mutate(),
            disabled: vincular.isPending,
            loading: vincular.isPending,
            mostrar: true,
          },
          {
            num: 2,
            titulo: "Atualizar Resultado",
            desc: "Sincroniza saldos do ERP + recalcula + materializa o snapshot. Roda em segundo plano (job com progresso) — pode levar de 30s a 1 min.",
            botao: materializar.isPending ? "Iniciando..." : "Atualizar Resultado",
            icone: <PlayCircle className="h-4 w-4" />,
            onClick: handleGerarResultado,
            disabled: materializar.isPending || semContas,
            loading: materializar.isPending,
            mostrar: true,
          },
          {
            num: 3,
            titulo: "Conferir e exportar",
            desc: "Use Exportar, Histórico ou Editar estrutura conforme necessidade.",
            botao: "Ver ações",
            icone: <FileSpreadsheet className="h-4 w-4" />,
            mostrar: true,
          },
        ].filter((p) => p.mostrar);


        return (
          <div className="mb-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
            <div className="mb-3 flex items-start gap-2">
              <div className="rounded-full bg-blue-600 p-1.5 text-white">
                <PlayCircle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900">
                  Como gerar o resultado — passo a passo
                </div>
                <div className="text-xs text-slate-600">
                  {autoRunning
                    ? `Executando automaticamente · ${autoStep === "vincular" ? "Vinculando contas..." : "Atualizando resultado (sync ERP + recálculo)..."}`
                    : "Rode o processo completo com um clique ou execute cada passo abaixo."}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => executarTudoAutomatico()}
                disabled={autoRunning}
                className="shrink-0"
              >
                {autoRunning ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Executando...</>
                ) : (
                  <><PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Executar tudo automaticamente</>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {passos.map((p, idx) => {
                const done = feito(p.num);
                const active = atual(p.num);
                return (
                  <div
                    key={p.num}
                    className={cn(
                      "relative flex flex-col rounded-lg border bg-white p-3 transition-all",
                      done && "border-emerald-300 bg-emerald-50/50",
                      active && "border-blue-500 ring-2 ring-blue-200 shadow-md",
                      !done && !active && "border-slate-200 opacity-70",
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                          done && "bg-emerald-500 text-white",
                          active && "bg-blue-600 text-white",
                          !done && !active && "bg-slate-200 text-slate-600",
                        )}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : p.num}
                      </div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                        {p.icone}
                        {p.titulo}
                      </div>
                    </div>
                    <div className="mb-3 flex-1 text-xs text-slate-600">{p.desc}</div>
                    {p.onClick ? (
                      <Button
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={p.onClick}
                        disabled={p.disabled}
                        className={cn("w-full", active && "animate-pulse")}
                      >
                        {p.loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        {p.botao}
                      </Button>
                    ) : (
                      <div className="text-xs italic text-slate-500">
                        Disponível após gerar o resultado
                      </div>
                    )}
                    {idx < passos.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 z-10" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {balancoIncompleto && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            A estrutura deste balanço pode estar incompleta — última linha
            cadastrada: <strong>{ultimaLinha?.codigo}</strong>{" "}
            {ultimaLinha?.descricao ? `(${ultimaLinha.descricao})` : ""}.
            Verifique a aba <strong>Estrutura</strong> e adicione os grupos
            finais (ex: contas de compensação e totalizadores).
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to={`/contabilidade/dre-studio/${id}/estrutura`}>
              Ir para Estrutura
            </Link>
          </Button>
        </div>
      )}
      {balancoSemVincular && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            A API ainda não retornou a linha <strong>VINCULAR</strong>. O Balanço
            pode não fechar conforme a máscara oficial.
          </div>
        </div>
      )}
      {balancoComDiferenca && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            Balanço com diferença de fechamento. Verifique linhas <strong>VINCULAR</strong> e <strong>CTARED 0</strong>.
          </div>
        </div>
      )}
      {/* Banner da linha 8.2 removido — a API oficial não usa mais esse ajuste. */}

      {!isBalanco && isModeloDREOficial && (
        <ConciliacaoDREBalancoPanel
          dreModeloId={id}
          dreResultado={q.data}
          dreLoading={q.isLoading}
          codfil={codfilNum}
          anomesIni={ini}
          anomesFim={fim}
        />
      )}

      {isBalanco && (
        <>
          <div className="mb-4 grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-[auto_auto_auto_auto_1fr]">
            <div>
              <Label className="text-xs text-slate-600">Tipo de visão</Label>
              <Select value={modoBalanco} onValueChange={(v) => setModoBalanco(v as ModoBalanco)}>
                <SelectTrigger className="h-9 w-[320px] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENSAL_E650SAL">Sistema (E650SAL.SALMES) — Balanço Mensal Fechado</SelectItem>
                  <SelectItem value="CCCC106_E640LCT_ACUMULADO">Sistema (CCCC106 / E640LCT acumulado)</SelectItem>
                  <SelectItem value="CONCILIACAO_SENIOR_MENSAL">Conciliação Senior x Sistema (E650SAL.SALMES)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {modoBalanco === "CCCC106_E640LCT_ACUMULADO" && (
              <div>
                <Label className="text-xs text-slate-600">Data de corte (opcional)</Label>
                <Input
                  type="date"
                  value={dataCorte}
                  onChange={(e) => setDataCorte(e.target.value)}
                  className="h-9 w-[170px] mt-1"
                />
              </div>
            )}
            <div>
              <Label className="text-xs text-slate-600">Data inicial</Label>
              <Input
                type="date"
                value={dataIni}
                onChange={(e) => setDataIni(e.target.value)}
                className="h-9 w-[170px] mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Data final</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-9 w-[170px] mt-1"
              />
            </div>
            {modoBalanco === "MENSAL_E650SAL" && (
              <label className="flex items-center gap-2 text-xs text-slate-700 self-end pb-1">
                <Switch
                  checked={aplicarRefSenior}
                  onCheckedChange={setAplicarRefSenior}
                />
                Aplicar referência Senior
              </label>
            )}
            {modoBalanco === "MENSAL_E650SAL" && (
              <label
                className="flex items-center gap-2 text-xs text-slate-700 self-end pb-1"
                title="Deve bater com o valor usado ao gerar o snapshot. Se ligar/desligar e a grade zerar, clique em Atualizar Resultado."
              >
                <Switch
                  checked={expandirRE}
                  onCheckedChange={setExpandirRE}
                />
                Expandir resultado do exercício
              </label>
            )}
          </div>
          {modoBalanco === "CCCC106_E640LCT_ACUMULADO" && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                Modo <strong>CCCC106 / E640LCT acumulado</strong>: os saldos são
                acumulados até o fim de cada mês. Não comparar com{" "}
                <strong>Balanço Mensal Fechado (E650SAL.SALMES)</strong> —
                diferenças são esperadas, não erro. Para validação de
                fechamento mensal use o modo Mensal.
              </div>
            </div>
          )}
        </>
      )}

      {isConciliacaoSenior && (
        <div className="space-y-3">
          <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 text-sm text-violet-900">
            Esta visão compara <strong>SENIOR</strong> (referência oficial Senior) ×{" "}
            <strong>Sistema (E650SAL.SALMES)</strong>, usando a view{" "}
            <code>v_bi_contabil_conciliacao_senior_mensal</code>. A coluna{" "}
            <strong>DIF</strong> vem diretamente da API — o modo{" "}
            <code>MENSAL_E650SAL</code> não é alterado.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600">
              Competência: <strong>{String(anomesConciliacao).slice(4, 6)}/{String(anomesConciliacao).slice(0, 4)}</strong>
              {" "}— ajuste pela Data final acima.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => conciliacaoSenior.refetch()}
              disabled={conciliacaoSenior.isFetching}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1.5", conciliacaoSenior.isFetching && "animate-spin")} />
              Recarregar
            </Button>
          </div>
          {conciliacaoSenior.isError && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
              {(conciliacaoSenior.error as any)?.status === 404
                ? <>Endpoint <code>/conciliacao-senior-mensal</code> não disponível na API.</>
                : <>Erro ao carregar conciliação: {(conciliacaoSenior.error as Error)?.message}</>}
            </div>
          )}
          {conciliacaoSenior.isFetching && !conciliacaoSenior.data && (
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-slate-500">
              <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
              Carregando conciliação...
            </div>
          )}
          {conciliacaoSenior.data && conciliacaoSenior.data.linhas.length === 0 && !conciliacaoSenior.isFetching && (
            <div className="rounded-lg border bg-amber-50 border-amber-300 p-3 text-sm text-amber-900">
              Nenhum dado para {String(anomesConciliacao).slice(4, 6)}/{String(anomesConciliacao).slice(0, 4)}.
            </div>
          )}
          {conciliacaoSenior.data && conciliacaoSenior.data.linhas.length > 0 && (
            <ConciliacaoSeniorMensalTable
              linhas={conciliacaoSenior.data.linhas}
              anomes={anomesConciliacao}
            />
          )}
        </div>
      )}

      {!isConciliacaoSenior && (<>
      {isBalanco && linhas.length > 0 && (() => {
        const [yy, mm] = dataFim.split("-");
        const anomesFromDate = Number(yy) * 100 + Number(mm);
        const anomesValidacao = Number.isFinite(anomesFromDate) && anomesFromDate > 0
          ? Math.min(anomesFromDate, fim)
          : fim;
        void anomesValidacao;

        if (modoBalanco === "CCCC106_E640LCT_ACUMULADO" && !cccc106SemData) {
          return (
            <ValidacaoCCCC106
              linhas={linhas}
              anomesFim={anomesValidacao}
              metodoCalculoLinhas={metodoCalculoLinhas}
              modoBalanco={modoBalanco}
            />
          );
        }

        return null;
      })()}

      {/* === CONTEXTO === Ano · Filial · Centro · Visão · Modelo */}
      <div className="rounded-xl border bg-white shadow-sm mb-3">
        <button
          type="button"
          onClick={() => setContextoOpen((v) => !v)}
          className={`flex w-full items-center justify-between px-4 py-2 bg-slate-50/60 rounded-t-xl hover:bg-slate-100 text-left ${contextoOpen ? "border-b" : ""}`}
        >
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            {contextoOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Contexto
          </span>
          <span className="text-xs text-slate-600 truncate max-w-[75%] text-right flex items-center justify-end gap-2">
            {!contextoOpen && (
              <span className="text-slate-600 truncate">
                {anoSelecionado} · {codfil === "todas" ? "Todas filiais" : (filiais.find(f => String(f.codfil) === codfil)?.nome ?? `Filial ${codfil}`)} · {codccu === "todos" ? "Todos CC" : codccu} · {visao === "REAL" ? "Realizado" : visao === "ORC" ? "Orçado" : visao === "VARV" ? "Variação R$" : visao === "VARP" ? "Variação %" : "Comparativo"}
              </span>
            )}
            <span className="inline-flex items-center rounded-md bg-slate-900 text-white px-2 py-0.5 text-[10px] font-semibold">
              {modelo?.modelo?.tipo_modelo}
            </span>
            <span className="truncate max-w-[220px]">{modelo?.modelo?.nome}</span>
          </span>
        </button>
        {contextoOpen && (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium block mb-1">Ano</label>
            <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1].map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium block mb-1">Filial</label>
            <Select value={codfil} onValueChange={setCodfil}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {!isBalanco && <SelectItem value="todas">Todas</SelectItem>}
                {filiais.map((f) => (
                  <SelectItem key={f.codfil} value={String(f.codfil)}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isBalanco && (
              <p className="mt-1 text-[10px] text-slate-500">
                Balanço exige filial específica.
              </p>
            )}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium block mb-1">Centro de custo</label>
            <Select value={codccu} onValueChange={setCodccu}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(centros ?? []).map((c) => (
                  <SelectItem key={c.codccu} value={c.codccu}>
                    {c.codccu} — {c.desccu}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500 font-medium block mb-1">Visão</label>
            <Select value={visao} onValueChange={(v) => setVisao(v as Visao)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="REAL">Realizado</SelectItem>
                <SelectItem value="ORC">Orçado</SelectItem>
                <SelectItem value="VARV">Variação R$</SelectItem>
                <SelectItem value="VARP">Variação %</SelectItem>
                <SelectItem value="COMP">Comparativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        )}
      </div>

      {/* === PERÍODO === Meses visíveis com atalhos */}
      <div className="rounded-xl border bg-white shadow-sm mb-3">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50/60 rounded-t-xl">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Período</span>
          <span className="text-[11px] text-slate-500">
            {mesesVisiveis.length} mês(es) selecionado(s)
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="flex flex-wrap items-center gap-1">
            {MESES_ANO.map(({ mes, label }) => {
              const ativo = mesesVisiveis.includes(mes);
              return (
                <Button
                  key={mes}
                  type="button"
                  size="sm"
                  variant={ativo ? "default" : "outline"}
                  className="h-8 w-11 px-0 text-xs"
                  onClick={() =>
                    setMesesVisiveis((s) =>
                      s.includes(mes) ? s.filter((x) => x !== mes) : [...s, mes].sort((a, b) => a - b),
                    )
                  }
                >
                  {label}
                </Button>
              );
            })}
          </div>
          <span className="mx-2 h-6 w-px bg-slate-200" />
          <div className="flex flex-wrap items-center gap-1">
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setMesesVisiveis([1,2,3,4,5,6,7,8,9,10,11,12])}>Todos</Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setMesesVisiveis([])}>Nenhum</Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setMesesVisiveis([1,2,3])}>1º tri</Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setMesesVisiveis([4,5,6])}>2º tri</Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setMesesVisiveis([7,8,9])}>3º tri</Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setMesesVisiveis([10,11,12])}>4º tri</Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setMesesVisiveis([1,2,3,4,5,6])}>1º sem</Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setMesesVisiveis([7,8,9,10,11,12])}>2º sem</Button>
          </div>
        </div>
      </div>

      {/* === STATUS DO SNAPSHOT (resultado-pronto) === */}
      {q.meta && (() => {
        const isBalancoOficial = isBalanco && modoBalancoEfetivo === "MENSAL_E650SAL";
        const refAplicada = q.meta.referencia_senior_aplicada;
        const refOrigem = q.meta.referencia_senior_origem;
        const qtdRef = q.meta.qtd_referencias_aplicadas;
        const semReferencia = deveAvisarRefSeniorNaoAplicada;
        return (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>
                <strong>Última atualização:</strong>{" "}
                {q.meta.atualizado_em
                  ? new Date(q.meta.atualizado_em).toLocaleString("pt-BR")
                  : "—"}
              </span>
              {isBalancoOficial && (
                <>
                  {qtdRef != null && (
                    <span className="text-[11px] text-slate-500">
                      Qtd. referências aplicadas: <strong>{qtdRef}</strong>
                    </span>
                  )}
                </>
              )}

            </div>
            {semReferencia && (
              <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="flex-1">
                  O Balanço exibido está usando <strong>E650SAL pura</strong>, não a referência oficial Senior.
                </div>
              </div>
            )}
          </>
        );
      })()}



      {/* Aviso SEM_CACHE já é coberto pelo card "Como gerar o resultado" acima. */}


      {/* === AÇÕES === Dados + Saída + Visualização */}
      <div className="rounded-xl border bg-white shadow-sm mb-3">
        <div className="grid gap-4 p-4 md:grid-cols-[auto_auto_1fr] md:items-start">
          {/* Grupo: Dados */}
          <section aria-label="Ações de dados" className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Dados</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleCarregarAnoInteiro}
                disabled={materializar.isPending || vincular.isPending || q.isFetching || cccc106SemData}
              >
                <CalendarRange className="h-4 w-4 mr-1.5" />
                {materializar.isPending ? "Atualizando..." : "Carregar ano"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSincronizar}
                disabled={materializar.isPending || vincular.isPending || q.isFetching || cccc106SemData}
                title="Materializar novo snapshot da DRE/Balanço"
              >
                <Database className="h-4 w-4 mr-1.5" />
                Atualizar Resultado
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmRecalcular(true)}
                disabled={materializar.isPending || vincular.isPending || cccc106SemData}
              >
                <Calculator className="h-4 w-4 mr-1.5" />
                Recalcular
              </Button>
              {isBalanco && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAtualizarCacheSenior}
                  disabled={materializar.isPending || vincular.isPending || cccc106SemData}
                  title="Sincroniza saldos do Senior e materializa novo snapshot (job assíncrono com barra de progresso)."
                >
                  <Database className="h-4 w-4 mr-1.5" />
                  Atualizar cache Senior
                </Button>
              )}
              {tipoModelo === "BALANCO" && !modoBloqueado && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => vincular.mutate()}
                  disabled={materializar.isPending || vincular.isPending || cccc106SemData}
                  title="Vincula automaticamente as contas analíticas do plano Senior a este Balanço (pode levar até 1 min)"
                >
                  <Link2 className="h-4 w-4 mr-1.5" />
                  {vincular.isPending ? "Vinculando... (até 1 min)" : "Vincular contas"}
                </Button>
              )}
              {q.meta?.suporta_filtro_unidade === true && (
                <Select value={unidade} onValueChange={setUnidade}>
                  <SelectTrigger
                    className="h-9 w-[200px]"
                    title="Filtrar matriz por Unidade de Negócio"
                    aria-label="Unidade de negócio"
                  >
                    <SelectValue placeholder="Unidade de negócio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todas (consolidado)</SelectItem>
                    {(q.meta?.unidades_negocio ?? []).map((u) => (
                      <SelectItem key={u.codigo} value={u.codigo}>
                        {u.nome ? `${u.codigo} — ${u.nome}` : u.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                onClick={handleRecarregar}
                disabled={materializar.isPending || vincular.isPending || q.isFetching || cccc106SemData}
                title="Recarregar visualização"
                aria-label="Recarregar visualização"
              >
                <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
              </Button>
            </div>
          </section>


          {/* Grupo: Saída */}
          <section
            aria-label="Ações de saída"
            className="flex flex-col gap-1.5 md:pl-6 md:border-l md:border-slate-200"
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Saída</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExportarExcel} disabled={q.isFetching || linhas.length === 0}>
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                Exportar
              </Button>
              {!modoBloqueado && (
                <Button size="sm" variant="outline" onClick={() => setOpenHistoricoCache(true)}>
                  <History className="h-4 w-4 mr-1.5" />
                  Histórico
                </Button>
              )}
              {!modoBloqueado && (
                <Button size="sm" variant="outline" onClick={() => setEditorEstruturaOpen(true)}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Editar estrutura
                </Button>
              )}
            </div>
          </section>

          {/* Grupo: Visualização */}
          <section
            aria-label="Opções de visualização"
            className="flex flex-col gap-1.5 md:pl-6 md:border-l md:border-slate-200 lg:items-end"
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Visualização</span>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Select value={modo} onValueChange={(v) => setModo(v as Modo)}>
                <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINTETICO">Sintético</SelectItem>
                  <SelectItem value="ANALITICO">Analítico</SelectItem>
                  <SelectItem value="NIVEL3">Nível 3</SelectItem>
                </SelectContent>
              </Select>
              {modo !== "NIVEL3" && (
                <>
                  <Select
                    value={String(nivelExibido)}
                    onValueChange={(v) => aplicarNivel(v === "todos" ? "todos" : Number(v))}
                  >
                    <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Nível" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: maxDepth + 1 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>Nível {n}</SelectItem>
                      ))}
                      <SelectItem value="todos">Todos níveis</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="inline-flex rounded-md border overflow-hidden">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 rounded-none px-2"
                      onClick={expandirTudo}
                      disabled={linhas.length === 0}
                      title="Expandir todos os níveis"
                      aria-label="Expandir todos os níveis"
                    >
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                    <span className="w-px bg-slate-200" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 rounded-none px-2"
                      onClick={recolherTudo}
                      disabled={linhas.length === 0}
                      title="Recolher todos os níveis"
                      aria-label="Recolher todos os níveis"
                    >
                      <ChevronsDownUp className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
              {isBalanco && (
                <label className="flex items-center gap-1.5 text-xs text-slate-600 pl-2 border-l h-9">
                  <Switch
                    checked={mostrarTecnicas}
                    onCheckedChange={setMostrarTecnicas}
                  />
                  Linhas técnicas
                </label>
              )}
              <Button
                size="sm"
                variant={semCasasDecimais ? "default" : "outline"}
                className="h-9"
                onClick={() => setSemCasasDecimais((v) => !v)}
                title="Alternar exibição com/sem centavos (apenas visual)"
              >
                <Coins className="h-4 w-4 mr-1.5" />
                {semCasasDecimais ? "Sem centavos" : "Com centavos"}
              </Button>
            </div>
          </section>
        </div>
      </div>


      {modo !== "NIVEL3" && (
      <div className="rounded-lg border bg-white p-3 mb-3 space-y-3">

        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <Label className="text-xs text-slate-600">Buscar na grid</Label>
            <Input
              value={buscaGrid}
              onChange={(e) => setBuscaGrid(e.target.value)}
              placeholder="Descrição, conta, classificação..."
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-600">Natureza</Label>
            <Select value={filtroNatureza} onValueChange={setFiltroNatureza}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="PASSIVO">Passivo</SelectItem>
                <SelectItem value="PATRIMONIO">Patrimônio</SelectItem>
                <SelectItem value="VINCULAR">Vincular</SelectItem>
                <SelectItem value="RECEITA">Receita</SelectItem>
                <SelectItem value="DEDUCAO">Dedução</SelectItem>
                <SelectItem value="CUSTO">Custo</SelectItem>
                <SelectItem value="DESPESA">Despesa</SelectItem>
                <SelectItem value="RESULTADO">Resultado</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>

              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-600">Tipo</Label>
            <Select value={filtroTipoLinha} onValueChange={setFiltroTipoLinha}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="GRUPO">Grupo</SelectItem>
                <SelectItem value="ANALITICA">Analítica</SelectItem>
                <SelectItem value="SUBTOTAL">Subtotal</SelectItem>
                <SelectItem value="TOTAL">Total</SelectItem>
                <SelectItem value="FORMULA">Fórmula</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-600">Valor</Label>
            <Select value={filtroValor} onValueChange={setFiltroValor}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="COM_VALOR">Com valor</SelectItem>
                <SelectItem value="SEM_VALOR">Sem valor</SelectItem>
                <SelectItem value="POSITIVAS">Somente positivas</SelectItem>
                <SelectItem value="NEGATIVAS">Somente negativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-600">Conta vinculada</Label>
            <Select value={filtroConta} onValueChange={setFiltroConta}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                <SelectItem value="COM_CONTA">Com conta</SelectItem>
                <SelectItem value="SEM_CONTA">Sem conta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Exibindo {linhasFiltradas.length} de {linhas.length} linhas
            {filtrosAtivos && idsComAncestrais.size > linhasFiltradas.length && (
              <> (+ {idsComAncestrais.size - linhasFiltradas.length} ancestrais)</>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={limparFiltros} disabled={!filtrosAtivos}>
            Limpar filtros
          </Button>
        </div>
      </div>
      )}




      {modo === "ANALITICO" && semAnaliticas && (
        <div className="mb-3 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            Este modelo é resumido e não contém contas analíticas como linhas.
            Para ver a árvore completa, recrie o modelo com{" "}
            <code className="font-mono">nivel_max=9</code> (modo COMPLETO).
          </div>
          {!modoBloqueado && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 bg-white text-amber-900 hover:bg-amber-100 shrink-0"
              disabled={recriarCompleto.isPending}
              onClick={() => setConfirmRecriar(true)}
            >
              {recriarCompleto.isPending ? "Recriando..." : "Recriar como COMPLETO"}
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={confirmRecriar} onOpenChange={(o) => !recriarCompleto.isPending && setConfirmRecriar(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recriar modelo como COMPLETO?</AlertDialogTitle>
            <AlertDialogDescription>
              Será criado um <strong>novo modelo</strong> a partir do plano de contas Senior
              com <code className="font-mono">nivel_max=9</code> e modo COMPLETO. O modelo
              atual permanece intacto. Após a criação você será redirecionado para a
              visualização do novo modelo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={recriarCompleto.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={recriarCompleto.isPending}
              onClick={async (e) => {
                e.preventDefault();
                const baseNome = modelo?.modelo?.nome ?? "Balanço Padrão Senior";
                const baseDesc = modelo?.modelo?.descricao ?? "";
                try {
                  const r = await recriarCompleto.mutateAsync({
                    nome: `${baseNome} (COMPLETO)`,
                    descricao: baseDesc || undefined,
                    nivel_max: 9,
                    modo: "COMPLETO",
                  });
                  setConfirmRecriar(false);
                  if (r.modelo?.id) {
                    navigate(`/contabilidade/dre-studio/${r.modelo.id}/visualizacao`);

                  }
                } catch {
                  /* toast já tratado no hook */
                }
              }}
            >
              {recriarCompleto.isPending ? "Recriando..." : "Recriar como COMPLETO"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PendenciasCtaredZeroPanel
        enabled={isBalanco}
        codemp={undefined}
        codfil={codfilNum}
        anomes_ini={ini}
        anomes_fim={fim}
      />

      {mesesSemCache.length > 0 && (
        <div className="mb-3 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            Existem meses selecionados sem cache calculado:{" "}
            <strong>{mesesSemCache.map((a) => formatAnomes(String(a))).join(", ")}</strong>.
            Os meses sem cache não são exibidos na tabela. Atualize o cache para vê-los.
          </div>
          <Button
            size="sm"
            onClick={() => {
              const iniSel = Math.min(...mesesSemCache, anoSelecionado * 100 + Math.min(...mesesVisiveis));
              const fimSel = Math.max(...mesesSemCache, anoSelecionado * 100 + Math.max(...mesesVisiveis));
              return dispararMaterializacao({
                ...filtros,
                anomes_ini: iniSel,
                anomes_fim: fimSel,
                tipo_modelo: tipoModeloPayload,
                ...(isBalanco
                  ? { data_ini: firstDayOfAnomes(iniSel), data_fim: defaultDataFim(fimSel) }
                  : {}),
              });
            }}
            disabled={materializar.isPending}
            className="shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", materializar.isPending && "animate-spin")} />
            Atualizar cache do período selecionado
          </Button>

        </div>
      )}


      <div className="relative">
      <div ref={matrizScrollRef} className="relative rounded-lg border bg-white overflow-auto isolate [&::-webkit-scrollbar:horizontal]:hidden">


        {materializar.isPending && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2 rounded-md bg-white shadow px-4 py-2 text-sm border">
              <Loader2 className="h-4 w-4 animate-spin" />
              Iniciando materialização do resultado...
            </div>
          </div>
        )}



        {q.isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : q.isError ? (
          (() => {
            const msg = String(q.error?.message ?? "");
            const semCodfil =
              isBalanco && /codfil/i.test(msg);
            return (
              <div className="p-6 text-sm text-red-600">
                {semCodfil
                  ? "Selecione uma filial para consultar o Balanço Mensal Fechado."
                  : <>Erro ao carregar resultado do cache: {msg}</>}
              </div>
            );
          })()
        ) : q.meta?.status === "SEM_CACHE" ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="font-semibold">
                  Resultado ainda não materializado para estes parâmetros.
                </div>
                <div>
                  Clique em <strong>Atualizar Resultado</strong> (acima) para gerar o snapshot. O
                  snapshot é chaveado pelos 5 parâmetros abaixo — a leitura só encontra dados quando
                  a combinação bate exatamente com a usada na materialização.
                </div>
                <ul className="text-xs list-disc pl-5 space-y-0.5">
                  <li><strong>codfil:</strong> {codfilNum}</li>
                  <li><strong>modo_balanco:</strong> {modoBalancoEfetivo ?? "—"}</li>
                  <li><strong>fonte_saldo:</strong> E650SAL</li>
                  <li><strong>aplicar_referencia_senior:</strong> {String(aplicarRefSeniorEfetivo)}</li>
                  <li><strong>expandir_resultado_exercicio:</strong> {String(expandirREEfetivo)}</li>
                </ul>
                {isBalanco && modoBalancoEfetivo === "MENSAL_E650SAL" && (
                  <div className="text-xs">
                    Dica: se você já materializou antes, tente alternar o toggle
                    <strong> Expandir resultado do exercício</strong> — o snapshot existente pode
                    estar salvo com o valor oposto.
                  </div>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => dispararMaterializacao()}
              disabled={materializar.isPending || vincular.isPending}
            >
              <Database className="h-4 w-4 mr-1.5" />
              Atualizar Resultado
            </Button>
          </div>
        ) : linhas.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            {semContas
              ? "Este modelo ainda não possui contas vinculadas. O recálculo foi executado, mas não há base para calcular valores."
              : <>Nenhum resultado calculado para este período. Clique em <strong>Atualizar Resultado</strong> para materializar o snapshot.</>}
          </div>
        ) : modo === "NIVEL3" ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b sticky top-0 z-30">
              <tr>
                <th className="text-left px-3 py-2 min-w-[120px]">Natureza</th>
                <th className="text-left px-3 py-2 border-l min-w-[120px]">Código Nível 3</th>
                <th className="text-left px-3 py-2 border-l min-w-[260px]">Descrição</th>
                {colunasVisiveis.map((c) => (
                  <th
                    key={c}
                    className={cn(
                      "text-center px-2 py-2 border-l min-w-[120px]",
                      isTotalAnoCol(c) && "bg-slate-100",
                    )}
                    title={isTotalAnoCol(c) ? (isBalanco ? "Saldo do último mês visível" : "Soma apenas dos meses selecionados") : undefined}
                  >
                    {isTotalAnoCol(c) ? labelTotalVisivel : formatAnomes(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultadoNivel3.length === 0 ? (
                <tr>
                  <td colSpan={colunasVisiveis.length + 3} className="text-center text-slate-500 py-10">
                    Nenhum grupo de Nível 3 encontrado para este período.
                  </td>
                </tr>
              ) : (
                (() => {
                  const blocos: React.ReactNode[] = [];
                  const naturezasOrdenadas = Array.from(totaisNivel3.porNatureza.keys()).sort();
                  for (const natureza of naturezasOrdenadas) {
                    const grupos = resultadoNivel3.filter((g) => g.natureza === natureza);
                    for (const g of grupos) {
                      blocos.push(
                        <tr key={`${natureza}-${g.codigo}`} className="border-b">
                          <td className="px-3 py-1.5 font-mono text-xs text-slate-600">{natureza}</td>
                          <td className="px-3 py-1.5 border-l font-mono text-xs text-slate-600">{g.codigo}</td>
                          <td className="px-3 py-1.5 border-l">{g.descricao}</td>
                          {colunasVisiveis.map((c) => (
                            <td key={c} className={cn("border-l", isTotalAnoCol(c) && "bg-slate-100")}>
                              <MoneyCell value={isTotalAnoCol(c) ? calcTotalVisivel(g.valores) : (g.valores[c] ?? null)} variant="money" emptyAs="dash" />
                            </td>
                          ))}
                        </tr>,
                      );
                    }
                    const totNat = totaisNivel3.porNatureza.get(natureza)!;
                    blocos.push(
                      <tr key={`tot-${natureza}`} className="border-b bg-slate-50 font-semibold">
                        <td className="px-3 py-1.5 font-mono text-xs">{natureza}</td>
                        <td className="px-3 py-1.5 border-l" />
                        <td className="px-3 py-1.5 border-l">TOTAL {natureza}</td>
                        {colunasVisiveis.map((c) => (
                          <td key={c} className={cn("border-l", isTotalAnoCol(c) && "bg-slate-100")}>
                            <MoneyCell value={isTotalAnoCol(c) ? calcTotalVisivel(totNat.valores) : (totNat.valores[c] ?? null)} variant="money" emptyAs="dash" />
                          </td>
                        ))}
                      </tr>,
                    );
                  }
                  blocos.push(
                    <tr key="tot-geral" className="border-b bg-slate-100 font-bold">
                      <td className="px-3 py-2" colSpan={3}>TOTAL GERAL</td>
                      {colunasVisiveis.map((c) => (
                        <td key={c} className={cn("border-l", isTotalAnoCol(c) && "bg-slate-200")}>
                          <MoneyCell value={isTotalAnoCol(c) ? calcTotalVisivel(totaisNivel3.totalGeral.valores) : (totaisNivel3.totalGeral.valores[c] ?? null)} variant="money" emptyAs="dash" />
                        </td>
                      ))}
                    </tr>,
                  );
                  return blocos;
                })()
              )}
            </tbody>
          </table>
        ) : (

          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b sticky top-0 z-30">
              <tr>
                <th
                  className="text-left px-2 py-2 sticky left-0 z-40 bg-slate-50 border-b"
                  style={{ width: 140, minWidth: 140 }}
                >
                  Classificação
                </th>
                <th
                  className="text-left px-3 py-2 border-l sticky z-40 bg-slate-50 border-b"
                  style={{ width: 320, minWidth: 320, left: 140 }}
                >
                  Descrição
                </th>
                <th
                  className="text-left px-2 py-2 border-l sticky z-40 bg-slate-50 border-b shadow-[1px_0_0_0_#e5e7eb]"
                  style={{ width: 140, minWidth: 140, left: 460 }}
                >
                  Conta Contábil
                </th>

                {colunasGrid.map((c) => {
                  const isAcumAno = isAcumuladoAnoCol(c);
                  const isAgregado = isTotalAnoCol(c) || isAcumAno;
                  const st = isAgregado ? undefined : statusByAnomes.get(c);
                  const statusUp = String(st?.status ?? "").toUpperCase();
                  const dotCls =
                    !st
                      ? null
                      : statusUp === "PROCESSADO"
                        ? "bg-emerald-500"
                        : statusUp === "ERRO"
                          ? "bg-red-500"
                          : "bg-amber-400";
                  const isMesSemCache =
                    !isAgregado && !processadosSet.has(String(c));
                  const tip = isAcumAno
                    ? tipAcumuladoAno
                    : isTotalAnoCol(c)
                    ? (isBalanco ? "Saldo do último mês visível" : "Soma apenas dos meses selecionados")
                    : [
                        st?.status ? `Cache: ${st.status}` : "Cache: SEM CACHE",
                        st?.ultima_execucao ? `Última execução: ${st.ultima_execucao}` : undefined,
                        st?.mensagem ? `Mensagem: ${st.mensagem}` : undefined,
                        isBalanco && st?.fechamento_ok === true ? "Balanço fechado" : undefined,
                        isBalanco && st?.fechamento_ok === false ? "Balanço divergente" : undefined,
                      ].filter(Boolean).join(" • ");
                  const labelCol = isAcumAno
                    ? labelAcumuladoAno
                    : isTotalAnoCol(c)
                    ? labelTotalVisivel
                    : formatAnomes(c);
                  return (
                    <th
                      key={c}
                      className={cn(
                        "text-center px-2 py-2 border-l border-b bg-slate-50",
                        visao === "COMP" ? "min-w-[260px]" : "min-w-[120px]",
                        isTotalAnoCol(c) && "bg-slate-100",
                        isAcumAno && "bg-sky-50 border-l-2 border-l-sky-300",
                        isMesSemCache && "bg-amber-50",
                      )}
                      title={tip}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {!isAgregado && dotCls && (
                          <span className={cn("inline-block h-2 w-2 rounded-full", dotCls)} aria-hidden />
                        )}
                        <span className={cn(isAcumAno && "font-semibold text-sky-900")}>{labelCol}</span>
                        {isBalanco && !isAgregado && st?.fechamento_ok === true && (
                          <span className="text-[10px] text-emerald-700" title="Balanço fechado">✓</span>
                        )}
                        {isBalanco && !isAgregado && st?.fechamento_ok === false && (
                          <span className="text-[10px] text-red-700" title="Balanço divergente">⚠</span>
                        )}
                      </div>
                      {visao === "COMP" && (
                        <div className="grid grid-cols-4 text-[10px] text-slate-500 font-normal mt-1">
                          {SUB_COLS.map((sc) => <div key={sc.key}>{sc.label}</div>)}
                        </div>
                      )}
                    </th>
                  );
                })}

              </tr>
            </thead>
            <tbody>
              {linhas
                .filter((l) => {
                  const isVirtualDREFilter =
                    l.origem_linha === "DRE_RESULTADO_EXERCICIO" ||
                    l.linha_virtual === true ||
                    String(l.codigo ?? "").startsWith("VINCULAR.");
                  // Linhas virtuais da DRE (filhas de VINCULAR) só dependem do ancestral
                  // (collapse de VINCULAR) e dos filtros livres — ignoram nível/sintético.
                  if (isVirtualDREFilter && !isLinhaVincular(l)) {
                    return (
                      !isHiddenByAncestor(l) &&
                      (!filtrosAtivos || idsComAncestrais.has(l.linha_id))
                    );
                  }
                  // Linha 000 e demais técnicas do Balanço só aparecem com o toggle.
                  if (isBalanco && isLinhaTecnicaBalanco(l)) {
                    return mostrarTecnicas;
                  }
                  // Balanço com Nível 1: allow-list explícita (ATIVO, PASSIVO, 99, VINCULAR).
                  if (isBalanco && nivelExibido === 1) {
                    return isNivel1Balanco(l);
                  }
                  if (isLinhaEspecial(l)) return true;
                  // DRE Sintético: linhas ANALITICAS aparecem somente quando o
                  // pai imediato está expandido (chevron aberto).
                  if (
                    modo === "SINTETICO" &&
                    tipoModelo !== "BALANCO" &&
                    l.tipo_linha === "ANALITICA"
                  ) {
                    const paiColapsado = l.linha_pai_id
                      ? collapsed.has(l.linha_pai_id)
                      : false;
                    return (
                      l.exibir !== false &&
                      !paiColapsado &&
                      !isHiddenByAncestorAcimaDoPai(l) &&
                      (!filtrosAtivos || idsComAncestrais.has(l.linha_id))
                    );
                  }
                  return (
                    l.exibir !== false &&
                    !isHiddenByAncestor(l) &&
                    (modo === "ANALITICO" || tipoModelo === "BALANCO" || l.tipo_linha !== "ANALITICA") &&
                    (!filtrosAtivos || idsComAncestrais.has(l.linha_id))
                  );
                })



                .map((l) => {
                const depth = depthMap.get(l.linha_id) ?? 0;
                const isTotal = l.tipo_linha === "TOTAL" || l.tipo_linha === "SUBTOTAL";
                const isAnalitica = l.tipo_linha === "ANALITICA";
                const isVincular = isLinhaVincular(l);
                const isTotalGeral = isLinhaTotalGeral(l);
                const is000 = isLinha000(l);

                // ---- Linha virtual da DRE (filha de VINCULAR) ----
                const isVirtualDRE =
                  (l.origem_linha === "DRE_RESULTADO_EXERCICIO" ||
                    l.linha_virtual === true ||
                    String(l.codigo ?? "").startsWith("VINCULAR.")) &&
                  !isVincular;
                const tipoReg = String(l.tipo_registro ?? "").toUpperCase();
                const isVirtualConta = isVirtualDRE && tipoReg === "CONTA_CONTABIL";
                const isVirtualAjuste = isVirtualDRE && tipoReg === "AJUSTE";
                const isVirtualTotal = isVirtualDRE && tipoReg === "TOTAL";
                const isVirtualGrupoSub =
                  isVirtualDRE && (tipoReg === "GRUPO" || tipoReg === "SUBTOTAL");
                const codigoVirtualRaw = String(l.codigo ?? "");
                const codigoVirtualDerivado = codigoVirtualRaw.startsWith("VINCULAR.")
                  ? codigoVirtualRaw.slice("VINCULAR.".length)
                  : codigoVirtualRaw;

                const codigoVirtual = String(l.codigo_exibicao ?? codigoVirtualDerivado ?? "").trim();


                const temFilhos = hasChildren(l.linha_id);
                const isCollapsed = collapsed.has(l.linha_id);

                // Descrição
                const descricaoVirtualPadrao =
                  tipoReg === "CONTA_CONTABIL"
                    ? (l.descricao_conta || l.descricao || l.descricao_linha || "—")
                    : (l.descricao || l.descricao_linha || "—");
                let descricaoExibida: string;
                if (is000) {
                  descricaoExibida = l.descricao && l.descricao.trim().length > 4
                    ? l.descricao
                    : "LANÇAMENTOS SEM CONTA CONTÁBIL / CTARED 0";
                } else if (isVincular) {
                  descricaoExibida = "RESULTADO DO EXERCÍCIO";
                } else if (isTotalGeral) {
                  descricaoExibida = l.descricao && l.descricao.trim().length > 0 ? l.descricao : "TOTAL GERAL";
                } else if (isVirtualAjuste) {
                  descricaoExibida = l.descricao_conta || l.descricao || l.descricao_linha || "Ajuste";
                } else if (isVirtualTotal) {
                  descricaoExibida = l.descricao || l.descricao_linha || "";
                } else if (isVirtualDRE) {
                  descricaoExibida = descricaoVirtualPadrao;
                } else {
                  descricaoExibida = l.descricao || l.descricao_linha || "";
                }


                const stickyBg = isTotalGeral
                  ? "bg-slate-100"
                  : is000
                    ? "bg-sky-50"
                    : isVincular || isVirtualTotal
                      ? "bg-amber-50"
                      : isTotal || isVirtualGrupoSub
                        ? "bg-slate-50"
                        : "bg-white";

                // Indentação: para virtuais usa nivel_visual quando vier.
                const nivelVisual =
                  isVirtualDRE && l.nivel_visual != null
                    ? Number(l.nivel_visual)
                    : depth;
                const paddingLeftDesc = (Number.isFinite(nivelVisual) ? nivelVisual : depth) * 16 + 12;

                const descNormBold = String(descricaoExibida ?? "")
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toUpperCase()
                  .replace(/\s+/g, " ")
                  .trim();
                const LINHAS_NEGRITO_FORCADO = new Set([
                  "RECEITAS FINANCEIRAS",
                  "DESPESAS FINANCEIRAS",
                  "OUTRAS RECEITAS",
                  "OUTRAS DESPESAS",
                  "IRPJ / CSLL (PROVISAO)",
                ]);
                const isLinhaNegritoForcado = LINHAS_NEGRITO_FORCADO.has(descNormBold);

                return (
                  <tr
                    key={l.linha_id}
                    className={cn(
                      "border-b",
                      isTotal && "bg-slate-50 font-semibold",
                      l.negrito && "font-semibold",
                      isAnalitica && "text-xs text-slate-600",
                      is000 && "bg-sky-50 text-sky-900 italic border-y border-sky-200",
                      isVincular && "bg-amber-50 border-y border-amber-200",
                      isTotalGeral && "bg-slate-100 font-bold border-t-2 border-slate-300",
                      isVirtualGrupoSub && "bg-slate-50 font-medium",
                      isVirtualTotal && "bg-amber-50 font-semibold",
                      isVirtualAjuste && "italic text-slate-700",
                      isVirtualConta && "text-xs text-slate-700",
                      isLinhaNegritoForcado && "font-bold",
                    )}
                  >

                    {(() => {
                      const cs = contasPorLinha.get(l.linha_id) ?? [];
                      const title =
                        cs.map((c) => `${c.ctared} - ${c.clacta} ${c.descta}`).join("\n") || undefined;
                      let classificacao: string;
                      if (isVincular) {
                        classificacao = "3";
                      } else if (isVirtualDRE) {
                        classificacao = String(l.codigo_exibicao || l.conta_contabil || l.codigo || "").trim();
                      } else if (cs.length === 0) {
                        classificacao = l.codigo ?? "-";
                      } else {
                        classificacao = formatarCampoContas(cs, "clacta");
                      }

                      return (
                        <td
                          className={cn(
                            "px-2 py-1.5 font-mono text-xs text-slate-600 whitespace-nowrap sticky left-0 z-20",
                            stickyBg,
                          )}
                          style={{ width: 140, minWidth: 140 }}
                          title={title}
                        >
                          {classificacao}
                        </td>
                      );
                    })()}
                    <td
                      className={cn(
                        "border-l px-3 py-1.5 sticky z-20 whitespace-nowrap",
                        stickyBg,
                      )}
                      style={{ paddingLeft: paddingLeftDesc, width: 320, minWidth: 320, left: 140 }}
                      title={
                        is000
                          ? "Lançamentos sem conta contábil (CTARED 0). Use para diagnóstico."
                          : isVincular
                            ? "Valores não vinculados à máscara do Balanço."
                            : String(descricaoExibida ?? "")
                      }
                    >
                      {temFilhos ? (
                        <button
                          type="button"
                          onClick={() => toggleCollapse(l.linha_id)}
                          className="inline-flex items-center justify-center h-4 w-4 mr-1 text-slate-500 hover:text-slate-900 align-middle"
                          aria-label={isCollapsed ? "Expandir" : "Recolher"}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="inline-block h-4 w-4 mr-1 align-middle" />
                      )}
                      {is000 && (
                        <AlertTriangle className="h-3.5 w-3.5 inline mr-1 align-middle text-sky-600" />
                      )}
                      <span className="inline-flex items-center gap-1 align-middle">
                        <span className="truncate inline-block align-middle max-w-[40ch]" title={String(descricaoExibida ?? "")}>{truncateLabel(descricaoExibida, 40)}</span>
                        {possuiDrill(l) && l.linha_id && (
                          <DrillsMenu
                            linha={l}
                            onSelect={(item: DrillMenuItem) =>
                              setDrillCtx({
                                modeloId: id,
                                linhaId: l.linha_id,
                                codigoLinha: l.codigo_linha ?? l.codigo ?? null,
                                linhaDescricao: descricaoExibida,
                                agrupar_por:
                                  normalizarDrillDimensao(String(item.agrupar_por ?? "")) ??
                                  "conta_contabil",
                                agrupar_por_raw: item.agrupar_por ?? null,
                                acao: item.acao ?? null,
                                endpoint: item.endpoint ?? null,
                                itemLabel: item.label ?? null,
                                filtros: {
                                  codemp: modelo?.modelo?.codemp ?? 1,
                                  codfil: codfilNum,
                                  anomes_ini: ini,
                                  anomes_fim: fim,
                                  centro_custo: codccu === "todos" ? null : codccu,
                                  modo_balanco: modoBalancoEfetivo ?? null,
                                  unidade: unidade === "TODOS" ? null : unidade,
                                },
                              })
                            }
                          />
                        )}

                      </span>

                    </td>




                    {(() => {
                      const cs = contasPorLinha.get(l.linha_id) ?? [];
                      let contaContabil: string;
                      let title: string | undefined;
                      if (isVirtualDRE) {
                        const ctared = l.conta_reduzida;
                        contaContabil =
                          ctared === null || ctared === undefined || String(ctared).trim() === ""
                            ? "-"
                            : String(ctared);
                        title = l.descricao_conta
                          ? String(l.descricao_conta)
                          : l.descricao
                            ? String(l.descricao)
                            : undefined;
                      } else {
                        contaContabil = cs.length === 0 ? "-" : formatarCampoContas(cs, "ctared");
                        title = cs.map((c) => `${c.ctared} - ${c.clacta} ${c.descta}`).join("\n") || undefined;
                      }


                      return (
                        <td
                          className={cn(
                            "border-l px-2 py-1.5 font-mono text-xs text-slate-600 whitespace-nowrap sticky z-20 shadow-[1px_0_0_0_#e5e7eb]",
                            stickyBg,
                          )}
                          style={{ width: 140, minWidth: 140, left: 460 }}
                          title={title}
                        >
                          {contaContabil}
                        </td>
                      );
                    })()}

                    {colunasGrid.map((c) =>

                      visao === "COMP" ? renderCompCell(l, c) : renderSingleCell(l, c),
                    )}
                  </tr>
                );
              })}
              {linhas.length === 0 && (
                <tr><td colSpan={colunasGrid.length + 3} className="text-center text-slate-500 py-10">

                  Sem dados. Verifique o período ou monte a estrutura primeiro.
                </td></tr>
              )}

            </tbody>
          </table>
        )}
      </div>
      <FloatingHScrollbar targetRef={matrizScrollRef} />
      </div>
      {linhas.length > 0 && (
        <div className="text-xs text-slate-500 mt-2 text-right">
          {modo === "NIVEL3" ? `${resultadoNivel3.length} grupos exibidos` : `${linhas.length} linhas exibidas`}
        </div>
      )}
      </>)}


      <AlertDialog open={confirmRecalcular} onOpenChange={setConfirmRecalcular}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recalcular o modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação recalcula a DRE pelo ERP/Senior. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmRecalcular(false);
                handleRecalcular();
              }}
            >
              Recalcular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DrillDrawer
        open={!!drill}
        onOpenChange={(o) => !o && setDrill(null)}
        args={drill ? { ...drill, tipoModelo: isBalanco ? "BALANCO" : "DRE" } : drill}
      />
      <DrillResultadoPanel
        open={!!drillCtx}
        onOpenChange={(o) => !o && setDrillCtx(null)}
        ctx={drillCtx}
      />

      <HistoricoCacheDialog
        open={openHistoricoCache}
        onOpenChange={setOpenHistoricoCache}
        modeloId={id}
        codfil={codfilNum}
      />

      <DreEstruturaEditor
        open={editorEstruturaOpen}
        modeloId={id}
        onClose={() => setEditorEstruturaOpen(false)}
        onPublicado={() => q.refetch()}
      />


      {/* Mantido por compatibilidade — não usado aqui. */}
      {false && (
        <ResultadoExercicioDialog
          open={false}
          onOpenChange={() => {}}
          modeloId={id}
          codemp={undefined}
          codfil={codfilNum}
          anomesIni={ini}
          anomesFim={fim}
          linhasResultadoCache={linhasApi}
          periodos={periodosApi}
        />
      )}

      <MaterializacaoDialog
        open={materOpen}
        modeloId={id}
        jobId={materJobId}
        onClose={() => {
          setMaterOpen(false);
          setMaterJobId(null);
        }}
        onRetry={() => {
          setMaterJobId(null);
          dispararMaterializacao();
        }}
      />
    </div>
    </MoneyDisplayProvider>
  );
}

// Mantidos por compat com outras telas; não usados localmente.
void fmtBRL; void fmtPct;

export default Visualizacao;

