import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { DonutSideLegendCard } from "@/components/bi/charts/DonutSideLegendCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

import { ChevronDown, Info, RefreshCw, Loader2, AlertTriangle, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { BotaoRelatorioModuloPdf } from "@/components/rh/BotaoRelatorioModuloPdf";
import { RhDashboardWithBiLibrary } from "@/components/rh/RhDashboardWithBiLibrary";
import { buildResumoFolhaSeries } from "@/lib/rh/seriesBuilders";
import { RhLayoutToolbar } from "@/components/rh/RhLayoutToolbar";
import { useRhModuleLayout } from "@/hooks/useRhModuleLayout";
import { RESUMO_FOLHA_DEFAULTS, RESUMO_FOLHA_CATALOG } from "@/lib/rh/widgetCatalogs";
import { addMonths } from "@/lib/rh/relatorio";
import { AiInsightsPanel } from "@/components/rh/AiInsightsPanel";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  fetchResumoFolhaDashboard,
  fetchResumoFolhaDashboardCached,
  sincronizarResumoFolha,
  consultarStatusSincronizacaoRh,
  exportarResumoFolhaExcel,
  DashboardIndisponivelError,
  SincronizacaoCompatIndisponivelError,
  ExportarResumoFolhaError,
  toAnomes,
} from "@/lib/rh/api";
import { invalidateRhCache } from "@/lib/rh/rhCache";
import { KpiOrMissing, ValueOrMissing } from "@/components/rh/KpiOrMissing";
import { ResumoFolhaDrillDrawer, type ResumoFolhaDrillExtras } from "@/components/rh/ResumoFolhaDrillDrawer";
import type { ResumoFolhaDrillsMenuItem } from "@/lib/rh/types";
import { formatCurrency } from "@/lib/format";
import { tickCurrencyAbbrev } from "@/components/bi/utils/chartHelpers";

function defaultMonth(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}


function fmtCompetencia(v: string): string {
  const s = String(v ?? "").replace(/\D/g, "");
  if (s.length === 6) return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
  return v;
}

export default function ResumoFolhaPage() {
  const [ini, setIni] = useState(defaultMonth(-5));
  const [fim, setFim] = useState(defaultMonth(0));
  const [codemp, setCodemp] = useState("1");

  const baseParams = {
    anomes_ini: toAnomes(ini),
    anomes_fim: toAnomes(fim),
    codemp: Number(codemp) || 1,
  };
  const enabled = !!baseParams.anomes_ini && !!baseParams.anomes_fim;

  const qc = useQueryClient();

  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date | null>(null);

  const query = useQuery({
    queryKey: ["rh", "resumo-folha-dashboard", baseParams, "completo"],
    queryFn: () => fetchResumoFolhaDashboard(baseParams, "completo"),
    enabled,
    retry: (count, err) => (err instanceof DashboardIndisponivelError ? false : count < 1),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  // Série mensal vem em modo separado (backend não devolve `mensal` no completo)
  const queryMensal = useQuery({
    queryKey: ["rh", "resumo-folha-dashboard", baseParams, "mensal"],
    queryFn: () => fetchResumoFolhaDashboard(baseParams, "mensal"),
    enabled,
    retry: (count, err) => (err instanceof DashboardIndisponivelError ? false : count < 1),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });


  const data = query.data;
  const isLoading = query.isLoading;
  const isError = query.isError;
  const error = query.error;
  const indisponivel = error instanceof DashboardIndisponivelError;

  const kpis = data?.kpis;
  const missing = new Set(data?._missing_kpis ?? []);
  const isMissing = (k: string) => missing.has(k);

  const filiaisData = data?.filiais ?? [];
  const proventos = data?.proventos_vantagens ?? [];
  const descontos = data?.descontos ?? [];
  const tipos = data?.tipos_evento ?? [];
  const mensal = (queryMensal.data?.mensal?.length ? queryMensal.data.mensal : data?.mensal) ?? [];
  const diagnostico = data?.diagnostico ?? data?.debug;
  const { isAdmin } = useUserPermissions();

  // ============ Drill dos cards (fonte: dashboard.drills_menu) ============
  const drillsMenu: ResumoFolhaDrillsMenuItem[] = data?.drills_menu ?? [];
  const drillsMap = useMemo(() => {
    const m = new Map<string, ResumoFolhaDrillsMenuItem>();
    for (const d of drillsMenu) m.set(d.card, d);
    return m;
  }, [drillsMenu]);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillCard, setDrillCard] = useState<ResumoFolhaDrillsMenuItem | null>(null);
  const [drillCardValue, setDrillCardValue] = useState<number | null | undefined>(null);
  const [drillExtras, setDrillExtras] = useState<ResumoFolhaDrillExtras | undefined>(undefined);
  const DRILL_ALIASES: Record<string, string> = { salario_bruto: "salario_base" };
  const resolveDrillKey = (field: string) =>
    drillsMap.has(field) ? field : (DRILL_ALIASES[field] && drillsMap.has(DRILL_ALIASES[field]) ? DRILL_ALIASES[field] : null);
  const openDrill = (
    field: string,
    extras?: ResumoFolhaDrillExtras,
    valueOverride?: number | null,
  ) => {
    const key = resolveDrillKey(field);
    if (!key) {
      // eslint-disable-next-line no-console
      console.warn("[RH ResumoFolha] drill ausente", {
        card: field,
        drills_menu_cards: Array.from(drillsMap.keys()),
      });
      return;
    }
    const item = drillsMap.get(key)!;
    setDrillCard(item);
    setDrillCardValue(
      valueOverride !== undefined
        ? valueOverride
        : kpis
          ? (kpis[field] as number | null | undefined) ?? (kpis[key] as number | null | undefined)
          : null,
    );
    setDrillExtras(extras);
    setDrillOpen(true);
  };
  const kpiDrill = (field: string) => {
    const drillable = !!resolveDrillKey(field);
    return {
      drillable,
      onClick: drillable ? () => openDrill(field) : undefined,
    };
  };


  // ============ Diagnóstico de drills (admin) ============
  const copyDrillDiagnostico = async () => {
    const diag = {
      params: baseParams,
      drills_menu_recebidos: drillsMenu,
      cards_recebidos: Array.from(drillsMap.keys()),
      diagnostico: data?.diagnostico ?? null,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(diag, null, 2));
      toast.success("Diagnóstico de drills copiado.");
    } catch {
      toast.error("Não foi possível copiar. Veja o console.");
      // eslint-disable-next-line no-console
      console.log("[RH ResumoFolha] diagnóstico drills", diag);
    }
  };




  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncInFlight, setSyncInFlight] = useState(false);

  const refetchAfterSync = async () => {
    // 1. Limpa cache persistente Cloud (rh:*).
    await invalidateRhCache();
    // 2. Invalida todas as queries do RH (dashboard, drills, turnover, absenteísmo, quadro, etc.).
    await qc.invalidateQueries({ queryKey: ["rh"] });
    await qc.invalidateQueries({ queryKey: ["dg-rh"] });
    // 3. Força refetch imediato do dashboard e dos drills ativos + demais telas RH abertas.
    await Promise.all([
      qc.refetchQueries({ queryKey: ["rh", "resumo-folha-dashboard"], type: "active" }),
      qc.refetchQueries({ queryKey: ["rh", "resumo-folha-drill"], type: "active" }),
      qc.refetchQueries({ queryKey: ["rh", "turnover"], type: "active" }),
      qc.refetchQueries({ queryKey: ["rh", "absenteismo"], type: "active" }),
      qc.refetchQueries({ queryKey: ["rh", "quadro-dashboard"], type: "active" }),
      qc.refetchQueries({ queryKey: ["rh", "quadro-historico"], type: "active" }),
      qc.refetchQueries({ queryKey: ["rh", "contrato-experiencia"], type: "active" }),
      qc.refetchQueries({ queryKey: ["rh", "programacao-ferias"], type: "active" }),
    ]);
    setUltimaSincronizacao(new Date());
  };

  const syncMut = useMutation({
    mutationFn: () => sincronizarResumoFolha(baseParams),
    onMutate: () => {
      setSyncInFlight(true);
      const id = toast.loading("Sincronizando RH...", {
        description: "A operação pode levar alguns minutos. Você pode manter a aba aberta.",
      });
      return { id };
    },
    onSuccess: async (resp: any, _vars, ctx) => {
      const status = String(resp?.status ?? "").toUpperCase();
      if (status === "EM_PROCESSAMENTO" || status === "PROCESSING") {
        setSyncJobId(resp?.job_id ?? "pending");
        toast.loading("Sincronização em andamento...", {
          id: ctx?.id,
          description: resp?.mensagem ?? "Aguardando confirmação do backend.",
        });
        return;
      }
      setSyncInFlight(false);
      setSyncJobId(null);
      toast.success("Sincronização RH concluída.", { id: ctx?.id });
      await refetchAfterSync();
    },
    onError: (e: any, _vars, ctx) => {
      // Timeout do cliente: NÃO tratar como "API offline"; a sincronização
      // pode continuar processando no servidor. Deixa polling ativo.
      if (e?.isTimeout || e?.code === "CLIENT_TIMEOUT") {
        setSyncJobId((prev) => prev ?? "pending");
        toast.info(
          "A solicitação demorou mais que o esperado. A sincronização pode continuar em processamento no servidor.",
          {
            id: ctx?.id,
            description: "Clique em Verificar resultado quando quiser conferir se já concluiu.",
            duration: 10_000,
          },
        );
        return;
      }
      setSyncInFlight(false);
      setSyncJobId(null);
      if (e instanceof SincronizacaoCompatIndisponivelError) {
        toast.info("Sincronização compatível ainda não implementada na API.", { id: ctx?.id });
        return;
      }
      const tecnico =
        e?.response?.data?.diagnostico?.erro_tecnico ??
        e?.data?.diagnostico?.erro_tecnico;
      const detalhe = e?.response?.data?.detail ?? e?.data?.detail ?? e?.message ?? "";
      const description = tecnico
        ? typeof tecnico === "string" ? tecnico : JSON.stringify(tecnico)
        : typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe);
      toast.error("Não foi possível consultar os dados do RH.", { id: ctx?.id, description });
    },
  });

  const verificarResultado = async () => {
    const tid = toast.loading("Verificando resultado da sincronização...");
    try {
      const st = await consultarStatusSincronizacaoRh({
        codemp: baseParams.codemp,
        job_id: syncJobId && syncJobId !== "pending" ? syncJobId : undefined,
      });
      const status = String(st?.status ?? "").toUpperCase();
      if (!st || status === "OK" || status === "CONCLUIDO" || status === "SUCCESS") {
        setSyncInFlight(false);
        setSyncJobId(null);
        toast.success("Sincronização concluída. Atualizando dados...", { id: tid });
        await refetchAfterSync();
      } else if (status === "ERRO" || status === "FAILED" || status === "ERROR") {
        setSyncInFlight(false);
        setSyncJobId(null);
        const tecnico = st?.diagnostico?.erro_tecnico ?? st?.mensagem;
        toast.error("Falha na sincronização.", {
          id: tid,
          description: typeof tecnico === "string" ? tecnico : JSON.stringify(tecnico ?? {}),
        });
      } else {
        toast.info("Sincronização ainda em processamento.", {
          id: tid,
          description: st?.mensagem ?? "Tente novamente em alguns instantes.",
        });
      }
    } catch (e: any) {
      toast.error("Não foi possível verificar o status.", {
        id: tid,
        description: e?.message,
      });
    }
  };


  const statusQuery = useQuery({
    queryKey: ["rh", "resumo-folha-sync-status", baseParams.codemp, syncJobId],
    queryFn: () =>
      consultarStatusSincronizacaoRh({
        codemp: baseParams.codemp,
        job_id: syncJobId && syncJobId !== "pending" ? syncJobId : undefined,
      }),
    enabled: !!syncJobId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!syncJobId) return;
    const s = statusQuery.data;
    if (s === null) {
      setSyncInFlight(false);
      setSyncJobId(null);
      toast.success("Sincronização RH concluída.");
      void refetchAfterSync();
      return;
    }
    if (!s) return;
    const st = String(s.status ?? "").toUpperCase();
    if (st === "OK" || st === "CONCLUIDO" || st === "SUCCESS") {
      setSyncInFlight(false);
      setSyncJobId(null);
      toast.success("Sincronização RH concluída.");
      void refetchAfterSync();
    } else if (st === "ERRO" || st === "FAILED" || st === "ERROR") {
      setSyncInFlight(false);
      setSyncJobId(null);
      const tecnico = s?.diagnostico?.erro_tecnico ?? s?.mensagem;
      toast.error("Erro ao sincronizar dados do ERP Senior/Vetorh.", {
        description: typeof tecnico === "string" ? tecnico : JSON.stringify(tecnico ?? {}),
      });
    }
  }, [statusQuery.data, syncJobId, qc]);

  const syncing = syncMut.isPending || syncInFlight;

  const exportMut = useMutation({
    mutationFn: () => exportarResumoFolhaExcel(baseParams),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel exportado.");
    },
    onError: (e: any) => {
      if (e instanceof ExportarResumoFolhaError) {
        if (e.code === "SESSAO_EXPIRADA") toast.error("Sessão expirada. Faça login novamente.");
        else if (e.code === "ENDPOINT_INDISPONIVEL") toast.info("Exportação ainda não disponível no backend.");
        else if (e.code === "PERIODO_INVALIDO") toast.error("Período inválido para exportação.");
        else toast.error(e.message || "Falha ao exportar Excel.");
        return;
      }
      toast.error(e?.message || "Falha ao exportar Excel.");
    },
  });

  const kpisValues = kpis ? Object.values(kpis).map((v) => Number(v) || 0) : [];
  const totalKpis = kpisValues.reduce((a, b) => a + b, 0);
  const qtdLinhas =
    (diagnostico as any)?.qtd_linhas ?? (diagnostico as any)?.qtd_linhas_vm_folha;
  const vmFolhaStatus = String((diagnostico as any)?.vm_folha_status ?? "").toUpperCase();
  const vmFolhaPendente =
    vmFolhaStatus === "OBJETO_INEXISTENTE_NO_VETORH" ||
    vmFolhaStatus === "VM_FOLHA_COMPAT_PENDENTE";
  const semDados =
    !!data &&
    !isLoading &&
    !vmFolhaPendente &&
    (qtdLinhas === 0 ||
      (totalKpis === 0 && filiaisData.length === 0 && mensal.length === 0));

  const tiposPie = useMemo(() => {
    const total = tipos.reduce((a, t) => a + (t.valor || 0), 0) || 1;
    return tipos
      .map((t) => ({ ...t, label: t.cd_tp_evento ?? t.tipo, pct: (t.valor || 0) / total }))
      .sort((a, b) => b.valor - a.valor);
  }, [tipos]);

  const FILIAL_COLS: { key: string; label: string; format: "currency" | "horas" }[] = [
    { key: "salario_base", label: "Salário Base", format: "currency" },
    { key: "custo_total", label: "Custo Total", format: "currency" },
    { key: "qtd_horas", label: "Qtd. Horas", format: "horas" },
    { key: "custo_hora_extra", label: "Custo H. Extra", format: "currency" },
    { key: "qtd_hora_extra", label: "Qtd. H. Extra", format: "horas" },
    { key: "liquido", label: "Líquido", format: "currency" },
    { key: "fgts", label: "FGTS", format: "currency" },
    { key: "va", label: "V.A.", format: "currency" },
    { key: "inss", label: "INSS", format: "currency" },
    { key: "custo_ferias", label: "Custo Férias", format: "currency" },
    { key: "prov_ferias", label: "Prov. Férias", format: "currency" },
    { key: "prov_13", label: "Prov. 13º", format: "currency" },
    { key: "proventos", label: "Proventos", format: "currency" },
    { key: "descontos", label: "Descontos", format: "currency" },
  ];

  // ============ Layout do dashboard (editável) ============
  const layout = useRhModuleLayout("rh-resumo-folha", RESUMO_FOLHA_DEFAULTS);

  const blocks: Record<string, React.ReactNode> = useMemo(() => ({
    "kpis-resumo": (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 h-full">
        <Card className="md:row-span-2 border-l-4 border-l-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Líquido</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(["provento", "desconto", "total_liquido"] as const).map((key) => {
              const label = key === "provento" ? "Provento" : key === "desconto" ? "Desconto" : "Total Líquido";
              const tip =
                key === "provento"
                  ? "Soma dos eventos com tipeve ∈ {1,2} — proventos base + benefícios. Bate exato com o relatório oficial FPRF001 (Senior)."
                  : key === "desconto"
                  ? "Soma dos eventos com tipeve = 3 — INSS, IRRF, consignados, adiantamentos etc. Inclui o evento 264 “Líquido Rescisão”, que é pago à parte (a rescisão sai da folha do mês)."
                  : "Proventos − Descontos (com tipeve=3 inteiro). Considera o evento 264 “Líquido Rescisão” como saída, já que a rescisão é paga separadamente. Metodologia validada contra o FPRF001.";
              const colorCls =
                key === "desconto" ? "text-destructive" :
                key === "total_liquido" ? "text-primary" : "";
              const sizeCls = key === "total_liquido" ? "text-2xl" : "text-xl";
              const wrapCls = key === "total_liquido" ? "pt-2 border-t" : "";
              const drillable = drillsMap.has(key);
              const inner = (
                <>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span>{label}</span>
                    <TooltipProvider delayDuration={150}>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex text-muted-foreground/70 hover:text-foreground focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Metodologia do card ${label}`}
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {tip}
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <div className={`${sizeCls} font-bold tabular-nums ${colorCls}`}>
                    <ValueOrMissing value={kpis?.[key]} missing={isMissing(key)} field={key} />
                  </div>
                </>
              );
              if (!drillable) return <div key={key} className={wrapCls}>{inner}</div>;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir drill de ${label}`}
                  onClick={() => openDrill(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrill(key); }
                  }}
                  className={`${wrapCls} -mx-2 px-2 py-1 rounded cursor-pointer hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  {inner}
                </div>
              );
            })}
          </CardContent>

        </Card>
        
        <KpiOrMissing title="Salário Bruto" value={kpis?.salario_bruto} missing={isMissing("salario_bruto")} field="salario_bruto" loading={isLoading} tooltip="Salário nominal mensal por colaborador. Horistas = taxa/h × horas contratuais (R016/jornada); mensalistas = salemp. Não usa o campo salemp cru dos horistas." {...kpiDrill("salario_bruto")} />
        <KpiOrMissing title="Outras Gratificações" value={kpis?.outras_gratificacoes} missing={isMissing("outras_gratificacoes")} field="outras_gratificacoes" loading={isLoading} {...kpiDrill("outras_gratificacoes")} />
        <KpiOrMissing title="Benefícios" value={kpis?.beneficios} missing={isMissing("beneficios")} field="beneficios" loading={isLoading} tooltip="Benefícios oficiais do período (inclui V.A.)." {...kpiDrill("beneficios")} />
        <KpiOrMissing title="INSS (empregado)" value={kpis?.inss_total} missing={isMissing("inss_total")} field="inss_total" loading={isLoading} tooltip="Descontos de INSS dos colaboradores. Não representa GPS patronal." {...kpiDrill("inss_total")} />
        <KpiOrMissing title="INSS Patronal" value={kpis?.inss_patronal} missing={isMissing("inss_patronal")} field="inss_patronal" variant="warning" loading={isLoading} tooltip="Encargo patronal do INSS (~20% da base). Custo da empresa, não desconto do empregado." {...kpiDrill("inss_patronal")} />
        <KpiOrMissing title="FGTS" value={kpis?.fgts} missing={isMissing("fgts")} field="fgts" loading={isLoading} {...kpiDrill("fgts")} />
        <KpiOrMissing title="Rescisões" value={kpis?.rescisoes} missing={isMissing("rescisoes")} field="rescisoes" variant="warning" loading={isLoading} tooltip="Custo de rescisões calculado pelos eventos oficiais da folha." {...kpiDrill("rescisoes")} />
        <KpiOrMissing title="Custo Total" value={kpis?.custo_total} missing={isMissing("custo_total")} field="custo_total" variant="danger" loading={isLoading} {...kpiDrill("custo_total")} />
        <KpiOrMissing title="Hora Extra" value={kpis?.hora_extra} missing={isMissing("hora_extra")} field="hora_extra" variant="warning" loading={isLoading} {...kpiDrill("hora_extra")} />
        <KpiOrMissing title="Provisões" value={kpis?.provisoes} missing={isMissing("provisoes")} field="provisoes" loading={isLoading} {...kpiDrill("provisoes")} />
        <KpiOrMissing title="Custo das Férias" value={kpis?.custo_ferias} missing={isMissing("custo_ferias")} field="custo_ferias" loading={isLoading} {...kpiDrill("custo_ferias")} />

      </div>
    ),
    "mensal-chart": (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução mensal</CardTitle>
          <p className="text-xs text-muted-foreground">Provento, Desconto e Líquido por competência</p>
        </CardHeader>
        <CardContent className="h-[calc(100%-3.5rem)]">
          {mensal.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              {isLoading ? "Carregando..." : "Sem dados no período"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mensal.map((m) => ({ ...m, label: fmtCompetencia(m.competencia) }))}
                margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                barCategoryGap="25%"
              >
                <defs>
                  <linearGradient id="rhBarProvento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="rhBarDesconto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="rhBarLiquido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="label"
                  fontSize={11}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  dy={4}
                />
                <YAxis
                  fontSize={11}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={tickCurrencyAbbrev}
                  width={70}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const order = ["provento", "desconto", "total_liquido"] as const;
                    const meta: Record<string, { name: string; color: string }> = {
                      provento: { name: "Provento", color: "hsl(var(--primary))" },
                      desconto: { name: "Desconto", color: "hsl(var(--destructive))" },
                      total_liquido: { name: "Líquido", color: "hsl(var(--success))" },
                    };
                    return (
                      <div
                        className="rounded-lg border bg-popover px-3 py-2 shadow-md"
                        style={{ borderColor: "hsl(var(--border))" }}
                      >
                        <div className="text-xs font-semibold text-foreground mb-1.5">{label}</div>
                        <div className="space-y-1">
                          {order.map((k) => {
                            const p = payload.find((x: any) => x.dataKey === k);
                            if (!p) return null;
                            return (
                              <div key={k} className="flex items-center gap-3 text-xs">
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ background: meta[k].color }}
                                />
                                <span className="text-muted-foreground">{meta[k].name}</span>
                                <span className="ml-auto tabular-nums font-medium text-foreground">
                                  {formatCurrency(Number(p.value) || 0)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  iconType="circle"
                  align="right"
                  verticalAlign="top"
                  height={28}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="provento"
                  name="Provento"
                  fill="url(#rhBarProvento)"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                  cursor={drillsMap.has("provento") ? "pointer" : undefined}
                  onClick={
                    drillsMap.has("provento")
                      ? (d: any) =>
                          openDrill(
                            "provento",
                            { competencia: d?.competencia, contextLabel: d?.label },
                            Number(d?.provento) || null,
                          )
                      : undefined
                  }
                />
                <Bar
                  dataKey="desconto"
                  name="Desconto"
                  fill="url(#rhBarDesconto)"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                  cursor={drillsMap.has("desconto") ? "pointer" : undefined}
                  onClick={
                    drillsMap.has("desconto")
                      ? (d: any) =>
                          openDrill(
                            "desconto",
                            { competencia: d?.competencia, contextLabel: d?.label },
                            Number(d?.desconto) || null,
                          )
                      : undefined
                  }
                />
                <Bar
                  dataKey="total_liquido"
                  name="Líquido"
                  fill="url(#rhBarLiquido)"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                  cursor={drillsMap.has("total_liquido") ? "pointer" : undefined}
                  onClick={
                    drillsMap.has("total_liquido")
                      ? (d: any) =>
                          openDrill(
                            "total_liquido",
                            { competencia: d?.competencia, contextLabel: d?.label },
                            Number(d?.total_liquido) || null,
                          )
                      : undefined
                  }
                />

              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    ),
    "mensal-table": (
      <Card className="h-full">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Detalhamento mensal</CardTitle></CardHeader>
        <CardContent className="overflow-auto max-h-[calc(100%-3rem)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead className="text-right">Provento</TableHead>
                <TableHead className="text-right">Desconto</TableHead>
                <TableHead className="text-right">Total Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4}><Skeleton className="h-6" /></TableCell></TableRow>}
              {!isLoading && mensal.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>
              )}
              {mensal.map((m, i) => {
                const cellCls = (field: string) =>
                  drillsMap.has(field)
                    ? "text-right tabular-nums cursor-pointer hover:bg-muted/60 hover:underline"
                    : "text-right tabular-nums";
                const cellClick = (field: string, v: number | null | undefined) =>
                  drillsMap.has(field)
                    ? () =>
                        openDrill(
                          field,
                          { competencia: m.competencia, contextLabel: fmtCompetencia(m.competencia) },
                          v ?? null,
                        )
                    : undefined;
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{fmtCompetencia(m.competencia)}</TableCell>
                    <TableCell className={cellCls("provento")} onClick={cellClick("provento", m.provento)}>{formatCurrency(m.provento ?? 0)}</TableCell>
                    <TableCell className={cellCls("desconto") + " text-destructive"} onClick={cellClick("desconto", m.desconto)}>{formatCurrency(m.desconto ?? 0)}</TableCell>
                    <TableCell className={cellCls("total_liquido") + " text-primary font-semibold"} onClick={cellClick("total_liquido", m.total_liquido)}>{formatCurrency(m.total_liquido ?? 0)}</TableCell>
                  </TableRow>
                );
              })}

            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ),
    "proventos": (() => {
      const drillable = drillsMap.has("proventos");
      return (
        <Card className="h-full">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Proventos + Vantagens</CardTitle></CardHeader>
          <CardContent className="overflow-auto max-h-[calc(100%-3rem)]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow><TableHead className="w-16">Cód.</TableHead><TableHead>Evento</TableHead><TableHead className="text-right">Proventos (R$)</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-6" /></TableCell></TableRow>}
                {!isLoading && proventos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>}
                {proventos.map((p, i) => (
                  <TableRow
                    key={i}
                    className={drillable ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={
                      drillable
                        ? () => openDrill(
                            "proventos",
                            { cd_evento: p.cd_evento ? String(p.cd_evento) : undefined, contextLabel: p.ds_evento ?? undefined },
                            p.valor ?? null,
                          )
                        : undefined
                    }
                  >
                    <TableCell className="text-muted-foreground">{p.cd_evento ?? "-"}</TableCell>
                    <TableCell>{p.ds_evento ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      );
    })(),
    "descontos": (() => {
      const drillable = drillsMap.has("descontos");
      return (
        <Card className="h-full">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Descontos</CardTitle></CardHeader>
          <CardContent className="overflow-auto max-h-[calc(100%-3rem)]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow><TableHead className="w-16">Cód.</TableHead><TableHead>Evento</TableHead><TableHead className="text-right">Desc. (R$)</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-6" /></TableCell></TableRow>}
                {!isLoading && descontos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>}
                {descontos.map((p, i) => (
                  <TableRow
                    key={i}
                    className={drillable ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={
                      drillable
                        ? () => openDrill(
                            "descontos",
                            { cd_evento: p.cd_evento ? String(p.cd_evento) : undefined, contextLabel: p.ds_evento ?? undefined },
                            p.valor ?? null,
                          )
                        : undefined
                    }
                  >
                    <TableCell className="text-muted-foreground">{p.cd_evento ?? "-"}</TableCell>
                    <TableCell className="text-xs">{p.ds_evento ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      );
    })(),

    "filial": (
      <Card className="h-full">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Filial</CardTitle></CardHeader>
        <CardContent className="overflow-auto max-h-[calc(100%-3rem)]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Cód.</TableHead>
                <TableHead>Filial</TableHead>
                {FILIAL_COLS.map((c) => (
                  <TableHead key={c.key} className="text-right">{c.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={FILIAL_COLS.length + 2}><Skeleton className="h-6" /></TableCell></TableRow>}
              {!isLoading && filiaisData.length === 0 && (
                <TableRow><TableCell colSpan={FILIAL_COLS.length + 2} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>
              )}
              {filiaisData.map((f, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">{f.cd_filial ?? "-"}</TableCell>
                  <TableCell className="font-medium">{f.filial}</TableCell>
                  {FILIAL_COLS.map((c) => {
                    const present = c.key in (f as any);
                    const v = (f as any)[c.key];
                    const drillable = present && drillsMap.has(c.key) && f.cd_filial != null;
                    return (
                      <TableCell
                        key={c.key}
                        className={
                          "text-right tabular-nums " +
                          (drillable ? "cursor-pointer hover:bg-muted/60 hover:underline" : "")
                        }
                        onClick={
                          drillable
                            ? () =>
                                openDrill(
                                  c.key,
                                  { cd_filial: String(f.cd_filial), contextLabel: f.filial ?? undefined },
                                  typeof v === "number" ? v : null,
                                )
                            : undefined
                        }
                      >
                        <ValueOrMissing value={v} missing={!present} field={c.key} format={c.format} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ),
    "tipos-evento": (
      <DonutSideLegendCard
        title="Tipos de Evento"
        subtitle="% e valor por tipo de evento"
        data={tiposPie.map((t: any) => ({
          label: String(t.label ?? "—"),
          valor: Number(t.valor) || 0,
          // preserva cd_tp_evento para o drill
          ...(t.cd_tp_evento != null ? { cd_tp_evento: String(t.cd_tp_evento) } : {}),
        })) as any}
        loading={isLoading}
        height={380}
        onItemClick={
          drillsMap.has("tipos_evento")
            ? (d: any) =>
                openDrill(
                  "tipos_evento",
                  {
                    cd_tp_evento: d?.cd_tp_evento ? String(d.cd_tp_evento) : undefined,
                    contextLabel: d?.label,
                  },
                  Number(d?.valor) || null,
                )
            : undefined
        }
      />
    ),

  }), [kpis, isMissing, isLoading, isAdmin, data, mensal, proventos, descontos, filiaisData, tiposPie, drillsMap]);

  return (
    <div className="container mx-auto px-3 md:px-6 py-4 md:py-6 space-y-3 md:space-y-4">
      <RhPageHeader
        title="01 — Resumo da Folha"
        subtitle="Visão consolidada de proventos, descontos e custo total"
        hideSync
        actions={
          <>
            <TooltipProvider delayDuration={150}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 border-success/40 text-success bg-success/5 cursor-help">
                    <ShieldCheck className="h-3 w-3" />
                    Validado FPRF001
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  Metodologia conferida contra o relatório oficial Senior FPRF001 — Relação de Cálculo (competência 202606, empresa 1). Proventos batem exato; Líquido segue a regra tipeve=3 inteiro (inclui evento 264).
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            <RhLayoutToolbar
              editing={layout.editing}
              onToggle={layout.setEditing}
              onReset={layout.resetLayout}
              widgets={layout.widgets}
              onShow={layout.showWidget}
              pageKey="rh-resumo-folha"
              onAdd={layout.addWidget}
              onCommit={layout.commitEdits}
              onCancel={layout.cancelEdits}
              hasPendingChanges={layout.hasPendingChanges}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportMut.mutate()}
              disabled={exportMut.isPending || !enabled}
            >
              {exportMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Exportar Excel
            </Button>
            <Button size="sm" onClick={() => syncMut.mutate()} disabled={syncing || !enabled}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {syncing ? "Sincronizando RH…" : "Sincronizar RH"}
            </Button>
            {syncInFlight && (
              <Button size="sm" variant="outline" onClick={verificarResultado}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar resultado
              </Button>
            )}
            <BotaoRelatorioModuloPdf
              modulo="resumo-folha"
              titulo="Resumo da Folha"
              disabled={!enabled || isLoading}
              dados={data ? { tipo: "resumo-folha", atual: data } : null}
              filtros={{ anomes_ini: baseParams.anomes_ini, anomes_fim: baseParams.anomes_fim, codemp: baseParams.codemp }}
              iaPayload={{ periodo: baseParams, kpis: data?.kpis, filiais: data?.filiais, tipos_evento: data?.tipos_evento, mensal: data?.mensal, top_proventos: data?.proventos_vantagens?.slice(0, 10), top_descontos: data?.descontos?.slice(0, 10) }}
              carregarAnterior={async () => {
                const len = baseParams.anomes_fim && baseParams.anomes_ini
                  ? (parseInt(baseParams.anomes_fim.slice(0, 4)) * 12 + parseInt(baseParams.anomes_fim.slice(4, 6))) - (parseInt(baseParams.anomes_ini.slice(0, 4)) * 12 + parseInt(baseParams.anomes_ini.slice(4, 6))) + 1
                  : 1;
                return fetchResumoFolhaDashboardCached({ anomes_ini: addMonths(baseParams.anomes_ini, -len), anomes_fim: addMonths(baseParams.anomes_ini, -1), codemp: baseParams.codemp }, "completo");
              }}
            />
          </>
        }
      />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
          <div><Label>Ano/mês inicial</Label><Input type="month" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
          <div><Label>Ano/mês final</Label><Input type="month" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          <div><Label>Empresa (codemp)</Label><Input value={codemp} onChange={(e) => setCodemp(e.target.value)} placeholder="1" /></div>
        </CardContent>
      </Card>

      {syncing && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>
            Sincronização em andamento. O processamento pode levar alguns minutos — você pode manter esta aba aberta.
          </span>
        </div>
      )}


      {(() => {
        const nowYm = (() => {
          const d = new Date();
          return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
        })();
        const mesAberto = baseParams.anomes_fim && baseParams.anomes_fim >= nowYm;
        if (!mesAberto && !ultimaSincronizacao) return null;
        return (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {mesAberto ? (
              <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-1.5">
                <Info className="h-3.5 w-3.5 text-warning" />
                <span>Mês em aberto: os valores podem mudar até o fechamento da folha.</span>
              </div>
            ) : <span />}
            {ultimaSincronizacao && (
              <span className="tabular-nums">
                Atualizado às {ultimaSincronizacao.toLocaleTimeString("pt-BR")}
              </span>
            )}
          </div>
        );
      })()}


      {indisponivel && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <div className="font-medium">Endpoint de dashboard da folha ainda não disponível.</div>
          <div className="text-muted-foreground mt-1">
            O backend precisa expor <code>GET /api/rh/resumo-folha/dashboard?anomes_ini=YYYYMM&amp;anomes_fim=YYYYMM&amp;codemp=1</code>.
          </div>
        </div>
      )}

      {isError && !indisponivel && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          Falha ao carregar dashboard da folha: {(error as any)?.message ?? "erro desconhecido"}
        </div>
      )}

      {vmFolhaPendente && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Camada compatível VM_FOLHA pendente</div>
            <div className="text-muted-foreground mt-1">
              VM_FOLHA não existe fisicamente no Vetorh. A API precisa calcular a camada compatível a partir das tabelas reais do ERP Senior/Vetorh.
            </div>
          </div>
        </div>
      )}

      {!indisponivel && !isError && semDados && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-4 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Sem dados retornados pela API para o período selecionado.</div>
            {qtdLinhas === 0 && (
              <div className="text-xs text-muted-foreground mt-1">A API respondeu, mas nenhuma linha foi encontrada. Rode a sincronização para trazer os dados do ERP Senior/Vetorh.</div>
            )}
            <div className="mt-3">
              <Button size="sm" onClick={() => syncMut.mutate()} disabled={syncing || !enabled}>
                {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronizar agora
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Componentes VM_FOLHA pendentes (visível a todos) */}
      {!indisponivel && !semDados &&
        Array.isArray((diagnostico as any)?.componentes_pendentes) &&
        (diagnostico as any).componentes_pendentes.length > 0 && (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
            <div className="font-semibold text-warning mb-1">
              Componentes não localizados pela API:
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
              {(diagnostico as any).componentes_pendentes.map((c: any, i: number) => (
                <li key={i}>
                  <span className="font-mono">{c?.campo ?? String(c)}</span>
                  {c?.motivo ? <> — {c.motivo}</> : null}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Diagnóstico admin: copiar drills_menu recebido */}
      {isAdmin && !indisponivel && !semDados && !!data && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={copyDrillDiagnostico} className="h-7 text-xs text-muted-foreground">
            Copiar diagnóstico de drills
          </Button>
        </div>
      )}



      {/* Grid editável dos widgets */}
      {!indisponivel && !semDados && (
        <RhDashboardWithBiLibrary
          pageKey="rh-resumo-folha"
          layout={layout}
          blocks={blocks}
          catalog={RESUMO_FOLHA_CATALOG}
          kpis={kpis as any}
          series={(data as any)?.series}
          derivedSeries={buildResumoFolhaSeries(data)}
          filtros={{ codemp: baseParams.codemp, anomes_ini: baseParams.anomes_ini, anomes_fim: baseParams.anomes_fim }}
        />
      )}





      <AiInsightsPanel
        modulo="resumo-folha"
        ready={!isLoading && !!data && !indisponivel && !semDados}
        payload={{
          periodo: { anomes_ini: baseParams.anomes_ini, anomes_fim: baseParams.anomes_fim, codemp: baseParams.codemp },
          kpis,
          filiais: filiaisData.slice(0, 20),
          top_proventos: [...proventos].sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0)).slice(0, 10),
          top_descontos: [...descontos].sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0)).slice(0, 10),
          tipos_evento: tipos,
          serie_mensal: mensal,
        }}
      />

      <ResumoFolhaDrillDrawer
        open={drillOpen}
        onOpenChange={setDrillOpen}
        drillItem={drillCard}
        cardValue={drillCardValue}
        anomes_ini={baseParams.anomes_ini}
        anomes_fim={baseParams.anomes_fim}
        extras={drillExtras}
      />

    </div>
  );
}
