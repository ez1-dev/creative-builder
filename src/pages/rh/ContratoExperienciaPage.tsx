import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, FileText, UserMinus, Clock, CalendarClock, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { BotaoRelatorioModuloPdf } from "@/components/rh/BotaoRelatorioModuloPdf";
import { RhFiltrosBar } from "@/components/rh/RhFiltrosBar";
import { RhDashboardGrid } from "@/components/rh/RhDashboardGrid";
import { RhLayoutToolbar } from "@/components/rh/RhLayoutToolbar";
import { useRhModuleLayout } from "@/hooks/useRhModuleLayout";
import { CONTRATOS_EXP_DEFAULTS, CONTRATOS_EXP_CATALOG } from "@/lib/rh/widgetCatalogs";
import { AiInsightsPanel } from "@/components/rh/AiInsightsPanel";
import { ConfigureRhWidgetDialog } from "@/components/rh/ConfigureRhWidgetDialog";
import { PageDataProvider } from "@/lib/bi/PageDataContext";
import { fetchContratoExperienciaDashboardCached, exportarContratoExperienciaExcel } from "@/lib/rh/api";
import type { ContratoExperienciaVencimento } from "@/lib/rh/types";
import type { RhWidget } from "@/hooks/useRhModuleLayout";
import { cn } from "@/lib/utils";

const JANELA_OPTIONS = [0, 30, 60, 90, 120];
const STATUS_FILTRO_OPTIONS = ["Todos", "VENCIDO", "A VENCER 5 DIAS", "A VENCER 10 DIAS", "A VENCER"] as const;
type StatusFiltro = (typeof STATUS_FILTRO_OPTIONS)[number];

function formatDateBR(s?: string | null): string {
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s);
}

function fmtDias(n?: number | null): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "-";
  return String(Math.trunc(Number(n)));
}

function normStatus(status?: string): string {
  return (status || "").toUpperCase().trim();
}

function isVencido(status?: string): boolean {
  return normStatus(status) === "VENCIDO";
}

function isUrgente(status?: string): boolean {
  const s = normStatus(status);
  return s === "VENCIDO" || s === "A VENCER 5 DIAS";
}

function statusBadgeCls(status?: string): string {
  const s = normStatus(status);
  if (s === "VENCIDO") return "bg-destructive text-destructive-foreground";
  if (s === "A VENCER 5 DIAS") return "bg-destructive text-destructive-foreground";
  if (s === "A VENCER 10 DIAS") return "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]";
  if (s === "A VENCER") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}

export default function ContratoExperienciaPage() {
  const [codemp, setCodemp] = useState<number>(1);
  const [diasVencidoMax, setDiasVencidoMax] = useState<number>(90);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("Todos");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["rh", "contrato-experiencia", "dashboard", codemp, diasVencidoMax],
    queryFn: () => fetchContratoExperienciaDashboardCached(codemp, diasVencidoMax),
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!error) return;
    const err = error as any;
    const status = err?.status ?? err?.response?.status ?? err?.statusCode;
    if (status === 401) toast.error("Sessão expirada. Faça login novamente.");
    else toast.error("Não foi possível carregar Contrato de Experiência.");
  }, [error]);

  const kpis = data?.kpis;

  const rowsSorted = useMemo<ContratoExperienciaVencimento[]>(() => {
    const list = data?.vencimentos ?? [];
    return [...list].sort((a, b) => {
      const av = isVencido(a.status);
      const bv = isVencido(b.status);
      if (av && !bv) return -1;
      if (!av && bv) return 1;
      if (av && bv) {
        // maior dias_vencido primeiro; fallback: data de vencimento mais antiga
        const ad = a.dias_vencido ?? -Infinity;
        const bd = b.dias_vencido ?? -Infinity;
        if (bd !== ad) return bd - ad;
        return (a.dt_segundo_vencimento || a.dt_primeiro_vencimento || "").localeCompare(
          b.dt_segundo_vencimento || b.dt_primeiro_vencimento || "",
        );
      }
      const ar = a.dias_restantes ?? Infinity;
      const br = b.dias_restantes ?? Infinity;
      return ar - br;
    });
  }, [data]);

  const rows = useMemo<ContratoExperienciaVencimento[]>(() => {
    if (statusFiltro === "Todos") return rowsSorted;
    return rowsSorted.filter((r) => normStatus(r.status) === statusFiltro);
  }, [rowsSorted, statusFiltro]);

  const [exportando, setExportando] = useState(false);
  async function exportar() {
    setExportando(true);
    try {
      const { blob, filename } = await exportarContratoExperienciaExcel(codemp, diasVencidoMax);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Excel gerado");
    } catch (e: any) {
      const st = e?.statusCode;
      if (st === 401) toast.error("Sessão expirada.");
      else if (e?.code === "ENDPOINT_INDISPONIVEL") toast.error("Exportação pendente na API.");
      else toast.error(e?.message || "Falha ao exportar");
    } finally {
      setExportando(false);
    }
  }

  const layout = useRhModuleLayout("rh-contratos-exp", CONTRATOS_EXP_DEFAULTS);
  const [configTarget, setConfigTarget] = useState<RhWidget | null>(null);

  const blocks: Record<string, React.ReactNode> = useMemo(() => ({
    "kpi-qtde": (
      <KpiCard
        title="Qtde Contratos"
        value={kpis?.qtde_contratos ?? 0}
        format="number"
        icon={<FileText className="h-4 w-4" />}
        loading={isLoading}
      />
    ),
    "kpi-vencidos-pendentes": (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setStatusFiltro("VENCIDO")}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setStatusFiltro("VENCIDO")}
        className="h-full cursor-pointer"
        title="Filtrar VENCIDO"
      >
        <KpiCard
          title="Vencidos Pendentes"
          value={kpis?.vencidos_pendentes ?? 0}
          format="number"
          variant="danger"
          icon={<AlertTriangle className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>
    ),
    "kpi-demitidos": (
      <KpiCard
        title="Demitidos 30 Após Exp."
        value={kpis?.demitidos_30_apos_exp ?? 0}
        format="number"
        variant="warning"
        icon={<UserMinus className="h-4 w-4" />}
        loading={isLoading}
      />
    ),
    "kpi-5dias": (
      <KpiCard
        title="A Vencer 5 Dias"
        value={kpis?.a_vencer_5_dias ?? 0}
        format="number"
        variant="danger"
        icon={<Clock className="h-4 w-4" />}
        loading={isLoading}
      />
    ),
    "kpi-10dias": (
      <KpiCard
        title="A Vencer 10 Dias"
        value={kpis?.a_vencer_10_dias ?? 0}
        format="number"
        variant="warning"
        icon={<CalendarClock className="h-4 w-4" />}
        loading={isLoading}
      />
    ),
    "vencimentos": (
      <Card className="h-full">
        <CardContent className="pt-6 h-full flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Vencimentos
            </h2>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as StatusFiltro)}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTRO_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Data Admissão</TableHead>
                  <TableHead>1º Vencimento</TableHead>
                  <TableHead>2º Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Dias Restantes</TableHead>
                  <TableHead className="text-right">Dias Vencido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={11}>
                        <Skeleton className="h-6" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-6">
                      Sem contratos para exibir.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r, i) => {
                  const vencido = isVencido(r.status);
                  const urgente = isUrgente(r.status);
                  return (
                    <TableRow
                      key={`${r.matricula}-${i}`}
                      className={cn(
                        vencido && "bg-destructive/10 hover:bg-destructive/15",
                        !vencido && urgente && "animate-row-urgent",
                      )}
                    >
                      <TableCell>{r.empresa}</TableCell>
                      <TableCell>{r.filial}</TableCell>
                      <TableCell>{r.colaborador}</TableCell>
                      <TableCell>{r.matricula}</TableCell>
                      <TableCell>{r.cargo}</TableCell>
                      <TableCell>{formatDateBR(r.dt_admissao)}</TableCell>
                      <TableCell>{formatDateBR(r.dt_primeiro_vencimento)}</TableCell>
                      <TableCell>{formatDateBR(r.dt_segundo_vencimento)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                            statusBadgeCls(r.status),
                            urgente && "font-bold",
                          )}
                        >
                          {r.status || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {vencido ? "-" : r.dias_restantes != null ? `${fmtDias(r.dias_restantes)} dias restantes` : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.dias_vencido != null ? `Vencido há ${fmtDias(r.dias_vencido)} dias` : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    ),
  }), [kpis, isLoading, rows, statusFiltro]);

  return (
    <div className="container mx-auto py-6 space-y-4">
      <RhPageHeader
        title="RH - 03 - Contrato de Experiência"
        actions={
          <>
            <RhLayoutToolbar
              editing={layout.editing}
              onToggle={layout.setEditing}
              onReset={layout.resetLayout}
              widgets={layout.widgets}
              onShow={layout.showWidget}
              pageKey="rh-contratos-exp"
              onAdd={layout.addWidget}
            />
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Atualizar
            </Button>
            <Button variant="outline" onClick={exportar} disabled={exportando || isLoading}>
              {exportando ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-1 h-4 w-4" />
              )}
              Exportar Excel
            </Button>
            <BotaoRelatorioModuloPdf
              modulo="contratos-experiencia"
              titulo="Contratos de Experiência"
              disabled={isLoading}
              dados={data ? { tipo: "contratos-experiencia", atual: data } : null}
              filtros={{ codemp, outros: { dias_vencido_max: String(diasVencidoMax) } }}
              iaPayload={{
                dias_vencido_max: diasVencidoMax,
                kpis: data?.kpis,
                vencimentos_amostra: data?.vencimentos?.slice(0, 15),
              }}
            />
          </>
        }
      />

      <RhFiltrosBar
        mostrarPeriodo={false}
        codemp={codemp}
        onCodempChange={setCodemp}
        disabled={isFetching}
        extras={
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium">Janela de vencidos</Label>
            <Select
              value={String(diasVencidoMax)}
              onValueChange={(v) => setDiasVencidoMax(Number(v))}
              disabled={isFetching}
            >
              <SelectTrigger className="h-9 w-[220px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JANELA_OPTIONS.map((o) => (
                  <SelectItem key={o} value={String(o)}>
                    {o === 0 ? "0 dias (não mostrar vencidos)" : `${o} dias`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <RhDashboardGrid
        loading={!layout.layoutReady}
        widgets={layout.widgets}
        blocks={blocks}
        editing={layout.editing}
        onLayoutChange={layout.saveGeometries}
        onHide={layout.hideWidget}
      />

      <AiInsightsPanel
        modulo="contratos-experiencia"
        ready={!isLoading && !!data}
        payload={{
          kpis,
          dias_vencido_max: diasVencidoMax,
          total_vencimentos: rowsSorted.length,
          amostra_prox_vencimentos: rowsSorted.slice(0, 15).map((r) => ({
            empresa: r.empresa,
            filial: r.filial,
            cargo: r.cargo,
            colaborador: r.colaborador,
            dt_admissao: r.dt_admissao,
            dt_primeiro_vencimento: r.dt_primeiro_vencimento,
            dt_segundo_vencimento: r.dt_segundo_vencimento,
            dias_restantes: r.dias_restantes,
            dias_vencido: r.dias_vencido,
            status: r.status,
          })),
        }}
      />
    </div>
  );
}
