import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, UserMinus, Clock, CalendarClock, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { BotaoRelatorioModuloPdf } from "@/components/rh/BotaoRelatorioModuloPdf";
import { RhFiltrosBar } from "@/components/rh/RhFiltrosBar";
import { RhDashboardGrid } from "@/components/rh/RhDashboardGrid";
import { RhLayoutToolbar } from "@/components/rh/RhLayoutToolbar";
import { useRhModuleLayout } from "@/hooks/useRhModuleLayout";
import { CONTRATOS_EXP_DEFAULTS } from "@/lib/rh/widgetCatalogs";
import { AiInsightsPanel } from "@/components/rh/AiInsightsPanel";
import { fetchContratoExperienciaDashboard, exportarContratoExperienciaExcel } from "@/lib/rh/api";
import { filtrarContratosPorPeriodo } from "@/lib/rh/filtros";
import type { ContratoExperienciaVencimento } from "@/lib/rh/types";
import { cn } from "@/lib/utils";

function currentYearRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return { ini: `${y}01`, fim: `${y}${m}` };
}

function formatDatePt(v?: string): string {
  if (!v) return "-";
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function normStatus(status?: string): string {
  return (status || "").toUpperCase().trim();
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
  if (s === "A VENCER") return "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]";
  return "bg-muted text-muted-foreground";
}

export default function ContratoExperienciaPage() {
  const initRange = currentYearRange();
  const [ini, setIni] = useState(initRange.ini);
  const [fim, setFim] = useState(initRange.fim);
  const [codemp, setCodemp] = useState<number>(1);

  const { data: dataRaw, isLoading, isFetching, error } = useQuery({
    queryKey: ["rh", "contrato-experiencia", "dashboard", codemp],
    queryFn: () => fetchContratoExperienciaDashboard(codemp),
  });

  const data = useMemo(
    () => filtrarContratosPorPeriodo(dataRaw ?? null, ini, fim),
    [dataRaw, ini, fim],
  );

  useEffect(() => {
    if (!error) return;
    const err = error as any;
    const status = err?.status ?? err?.response?.status;
    if (status === 401) toast.error("Sessão expirada. Faça login novamente.");
    else toast.error(err?.message || "Falha ao carregar contratos de experiência.");
  }, [error]);

  const kpis = data?.kpis;
  const rows = useMemo<ContratoExperienciaVencimento[]>(() => {
    const list = data?.vencimentos ?? [];
    return [...list].sort((a, b) => (a.dt_vencimento || "").localeCompare(b.dt_vencimento || ""));
  }, [data]);

  const [exportando, setExportando] = useState(false);
  async function exportar() {
    setExportando(true);
    try {
      const { blob, filename } = await exportarContratoExperienciaExcel(codemp);
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
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Vencimentos
          </h2>
          <div className="max-h-[calc(100%-2rem)] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data Admissão</TableHead>
                  <TableHead>Segundo Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-6" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      Nenhum contrato
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r, i) => {
                  const urgente = isUrgente(r.status);
                  return (
                    <TableRow
                      key={`${r.matricula}-${i}`}
                      className={cn(urgente && "animate-row-urgent")}
                    >
                      <TableCell>{r.empresa}</TableCell>
                      <TableCell>{r.filial}</TableCell>
                      <TableCell>{r.cargo}</TableCell>
                      <TableCell>{r.colaborador}</TableCell>
                      <TableCell>{formatDatePt(r.dt_admissao)}</TableCell>
                      <TableCell>{formatDatePt(r.dt_vencimento)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                            statusBadgeCls(r.status),
                            urgente && "font-bold animate-status-blink",
                          )}
                        >
                          {r.status || "-"}
                        </span>
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
  }), [kpis, isLoading, rows]);

  return (
    <div className="container mx-auto py-6 space-y-4">
      <RhPageHeader
        title="03 — Contrato Experiência"
        actions={
          <>
            <RhLayoutToolbar
              editing={layout.editing}
              onToggle={layout.setEditing}
              onReset={layout.resetLayout}
              widgets={layout.widgets}
              onShow={layout.showWidget}
            />
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
              filtros={{ anomes_ini: ini, anomes_fim: fim, codemp }}
              iaPayload={{ periodo: { anomes_ini: ini, anomes_fim: fim }, kpis: data?.kpis, vencimentos_amostra: data?.vencimentos?.slice(0, 15) }}
            />
          </>
        }
      />

      <RhFiltrosBar
        anomesIni={ini}
        onAnomesIniChange={setIni}
        anomesFim={fim}
        onAnomesFimChange={setFim}
        codemp={codemp}
        onCodempChange={setCodemp}
        disabled={isFetching}
      />

      <RhDashboardGrid
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
          total_vencimentos: rows.length,
          amostra_prox_vencimentos: rows.slice(0, 15).map((r) => ({
            empresa: r.empresa,
            filial: r.filial,
            cargo: r.cargo,
            colaborador: r.colaborador,
            dt_admissao: r.dt_admissao,
            dt_vencimento: r.dt_vencimento,
            status: r.status,
          })),
        }}
      />
    </div>
  );
}

