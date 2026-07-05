import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, RefreshCw, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { AreaChartCard } from "@/components/bi/charts/AreaChartCard";
import { BarChartCard } from "@/components/bi/charts/BarChartCard";
import { DonutChartCard } from "@/components/bi/charts/DonutChartCard";
import { cn } from "@/lib/utils";
import {
  fetchQuadroDashboard,
  fetchQuadroHistorico,
  exportQuadroDashboard,
  ExportQuadroIndisponivelError,
  type QuadroBreakdown,
  type QuadroEmpresaLinha,
} from "@/lib/rh/quadroDashboardApi";

function toIsoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
function toAnomes(d: Date): string {
  return format(d, "yyyyMM");
}
function janOfYear(d: Date): string {
  return `${d.getFullYear()}01`;
}
function fmtAnomes(v: string): string {
  const s = String(v ?? "").replace(/\D/g, "");
  if (s.length === 6) return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
  return v;
}

const KPIS_CONFIG: {
  key: string;
  title: string;
  variant?: "default" | "info" | "success" | "warning" | "danger";
  hideIfMissing?: boolean;
  showPctOfTotal?: boolean;
}[] = [
  { key: "total", title: "Total de colaboradores", variant: "info" },
  { key: "masculino", title: "Masculino", showPctOfTotal: true },
  { key: "feminino", title: "Feminino", showPctOfTotal: true },
  { key: "jovem_aprendiz", title: "Jovem Aprendiz" },
  { key: "estagiarios", title: "Estagiários" },
  { key: "pcd", title: "PCD" },
  { key: "admitidos_mes", title: "Admitidos no mês", variant: "success" },
  { key: "demitidos_mes", title: "Demitidos no mês", variant: "danger" },
  { key: "trabalhando", title: "Trabalhando", variant: "success" },
  { key: "ferias", title: "Férias", variant: "warning" },
  { key: "auxilio_doenca", title: "Auxílio doença", variant: "warning" },
  { key: "acidente", title: "Acidente", variant: "danger" },
  { key: "licenca_maternidade", title: "Licença maternidade", variant: "warning" },
  { key: "aposentadoria", title: "Aposentadoria", hideIfMissing: true },
];

function KpiOrPending({
  title, value, variant, loading, subtitle,
}: {
  title: string; value: number | null | undefined;
  variant?: "default" | "info" | "success" | "warning" | "danger"; loading?: boolean;
  subtitle?: string;
}) {
  if (loading) {
    return <KpiCard title={title} value={0} format="number" loading variant={variant} />;
  }
  if (value === null || value === undefined) {
    return (
      <Card className="border-warning/40">
        <CardHeader className="pb-1.5">
          <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[11px] font-medium text-warning" title="Campo pendente na API">
            Campo pendente na API
          </div>
        </CardContent>
      </Card>
    );
  }
  return <KpiCard title={title} value={value} format="number" variant={variant} subtitle={subtitle} />;
}

function BreakdownCard({
  title, data, variant = "bar", sort = true, loading,
}: {
  title: string;
  data?: QuadroBreakdown;
  variant?: "bar" | "donut";
  sort?: boolean;
  loading?: boolean;
}) {
  const rows = useMemo(() => {
    if (!data) return [];
    const arr = [...data];
    if (sort) arr.sort((a, b) => b.valor - a.valor);
    return arr;
  }, [data, sort]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-56 w-full" /></CardContent>
      </Card>
    );
  }
  if (!data || rows.length === 0) return null;

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

  if (variant === "donut") {
    return (
      <DonutChartCard
        title={title}
        data={rows}
        valueFormatter={fmt}
        height={260}
      />
    );
  }
  return (
    <BarChartCard
      title={title}
      data={rows}
      valueFormatter={fmt}
      height={260}
    />
  );
}

export default function QuadroColaboradoresPage() {
  const today = new Date();
  const [dataRef, setDataRef] = useState<Date>(today);
  const [anomesIni, setAnomesIni] = useState<string>(janOfYear(today));
  const [anomesFim, setAnomesFim] = useState<string>(toAnomes(today));
  const [exportando, setExportando] = useState(false);
  const qc = useQueryClient();

  const dataRefIso = toIsoDate(dataRef);

  const dashQ = useQuery({
    queryKey: ["rh", "quadro-dashboard", dataRefIso],
    queryFn: () => fetchQuadroDashboard(dataRefIso),
  });
  const histQ = useQuery({
    queryKey: ["rh", "quadro-historico", anomesIni, anomesFim],
    queryFn: () => fetchQuadroHistorico(anomesIni, anomesFim),
    enabled: /^\d{6}$/.test(anomesIni) && /^\d{6}$/.test(anomesFim),
  });

  const kpis = dashQ.data?.kpis ?? {};
  const kpisVisiveis = KPIS_CONFIG.filter((c) => {
    if (!c.hideIfMissing) return true;
    return kpis[c.key] !== undefined && kpis[c.key] !== null;
  });

  const historicoData = useMemo(
    () => (histQ.data ?? []).map((h) => ({ label: fmtAnomes(h.anomes), valor: h.total })),
    [histQ.data],
  );

  function atualizar() {
    qc.invalidateQueries({ queryKey: ["rh", "quadro-dashboard"] });
    qc.invalidateQueries({ queryKey: ["rh", "quadro-historico"] });
  }

  async function exportar() {
    setExportando(true);
    try {
      const blob = await exportQuadroDashboard(dataRefIso);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `quadro-colaboradores-${dataRefIso}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (e) {
      if (e instanceof ExportQuadroIndisponivelError) {
        toast.warning("Exportação pendente na API");
      } else {
        toast.error("Falha ao exportar");
      }
    } finally {
      setExportando(false);
    }
  }

  const anomesToInputMonth = (v: string) =>
    /^\d{6}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}` : "";
  const inputMonthToAnomes = (v: string) => (v ? v.replace("-", "") : "");

  return (
    <div className="container mx-auto py-6">
      <RhPageHeader title="02 — Quadro de Colaboradores" />

      <Card className="mb-4">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <Label>Data de referência</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataRef && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataRef ? format(dataRef, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataRef}
                  onSelect={(d) => d && setDataRef(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Histórico início</Label>
            <Input
              type="month"
              value={anomesToInputMonth(anomesIni)}
              onChange={(e) => setAnomesIni(inputMonthToAnomes(e.target.value))}
            />
          </div>
          <div>
            <Label>Histórico fim</Label>
            <Input
              type="month"
              value={anomesToInputMonth(anomesFim)}
              onChange={(e) => setAnomesFim(inputMonthToAnomes(e.target.value))}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={atualizar} variant="default" disabled={dashQ.isFetching}>
              {dashQ.isFetching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
              Atualizar
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportar} variant="outline" disabled={exportando}>
              {exportando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-1 h-4 w-4" />}
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
        {kpisVisiveis.map((c) => {
          const v = kpis[c.key];
          const total = kpis.total;
          const subtitle =
            c.showPctOfTotal && typeof v === "number" && typeof total === "number" && total > 0
              ? `${((v / total) * 100).toFixed(1)}% do total`
              : undefined;
          return (
            <KpiOrPending
              key={c.key}
              title={c.title}
              value={v}
              variant={c.variant}
              loading={dashQ.isLoading}
              subtitle={subtitle}
            />
          );
        })}
      </div>

      <div className="mb-4">
        {histQ.isLoading ? (
          <Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        ) : historicoData.length > 0 ? (
          <AreaChartCard
            title="Histórico Nº Colaboradores"
            data={historicoData}
            valueFormatter={(v) => new Intl.NumberFormat("pt-BR").format(v)}
            height={280}
          />
        ) : (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Histórico Nº Colaboradores</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Sem dados no período selecionado.</p>
            </CardContent>
          </Card>
        )}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <BreakdownCard title="Sexo" data={dashQ.data?.sexo} variant="donut" loading={dashQ.isLoading} />
        <BreakdownCard title="Situação / Afastamento" data={dashQ.data?.situacao} loading={dashQ.isLoading} />
        <BreakdownCard title="Vínculo" data={dashQ.data?.vinculo} loading={dashQ.isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <BreakdownCard title="Escolaridade" data={dashQ.data?.escolaridade} loading={dashQ.isLoading} />
        <BreakdownCard title="Faixa etária" data={dashQ.data?.faixa_etaria} sort={false} loading={dashQ.isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <BreakdownCard title="Tempo de casa" data={dashQ.data?.tempo_casa} sort={false} loading={dashQ.isLoading} />
        <FilialTable data={dashQ.data?.filial} loading={dashQ.isLoading} />
      </div>

      <div className="mb-4">
        {dashQ.data?.empresa && dashQ.data.empresa.length > 0 ? (
          <>
            <BreakdownCard title="Empresa" data={dashQ.data.empresa} loading={dashQ.isLoading} />
            {!dashQ.data.empresa.some((e) =>
              String(e.label ?? "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase()
                .includes("MONTAGEM EXTERNA"),
            ) && (
              <p className="text-xs text-muted-foreground mt-1">
                Montagem Externa pendente de regra na API.
              </p>
            )}
          </>
        ) : dashQ.data ? (
          <Card className="border-warning/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Empresa</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-warning">Classificação Empresa pendente de regra na API</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function FilialTable({ data, loading }: { data?: QuadroBreakdown; loading?: boolean }) {
  const rows = useMemo(() => (data ? [...data].sort((a, b) => b.valor - a.valor) : []), [data]);
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Filial</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-56 w-full" /></CardContent>
      </Card>
    );
  }
  if (!data || rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.valor, 0);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Filial</CardTitle></CardHeader>
      <CardContent>
        <div className="max-h-72 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Filial</TableHead>
                <TableHead className="text-right">Colaboradores</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{new Intl.NumberFormat("pt-BR").format(r.valor)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {total > 0 ? ((r.valor / total) * 100).toFixed(1) : "0.0"}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
