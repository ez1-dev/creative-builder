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
import { BotaoRelatorioModuloPdf } from "@/components/rh/BotaoRelatorioModuloPdf";
import { AreaChartCard } from "@/components/bi/charts/AreaChartCard";
import { BarChartCard } from "@/components/bi/charts/BarChartCard";
import { DonutChartCard } from "@/components/bi/charts/DonutChartCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

import {
  fetchQuadroDashboard,
  fetchQuadroColaboradores,
  fetchQuadroHistorico,
  exportQuadroDashboard,
  ExportQuadroIndisponivelError,
  type QuadroBreakdown,
  type QuadroEmpresaLinha,
  type ColaboradorDetalhe,
} from "@/lib/rh/quadroDashboardApi";
import { QuadroDrillCard } from "@/components/rh/QuadroDrillCard";
import { AiInsightsPanel } from "@/components/rh/AiInsightsPanel";
import { QuadroDrillModal } from "@/components/rh/QuadroDrillModal";
import {
  filterDetalheByKpi,
  filterDetalheByDimensao,
  filterDetalheBySexoLabel,
} from "@/lib/rh/quadroDrillPredicates";

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
  title, value, variant, loading, subtitle, onClick,
}: {
  title: string; value: number | null | undefined;
  variant?: "default" | "info" | "success" | "warning" | "danger"; loading?: boolean;
  subtitle?: string;
  onClick?: () => void;
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
  return (
    <KpiCard
      title={title}
      value={value}
      format="number"
      variant={variant}
      subtitle={subtitle}
      onClick={onClick}
    />
  );
}

function BreakdownCard({
  title, data, variant = "bar", sort = true, loading, onItemClick,
}: {
  title: string;
  data?: QuadroBreakdown;
  variant?: "bar" | "donut";
  sort?: boolean;
  loading?: boolean;
  onItemClick?: (label: string) => void;
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
  const tickFmt = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
    if (abs >= 1_000) return `${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
    return fmt(v);
  };

  const handleClick = onItemClick ? (d: any) => onItemClick(String(d?.label ?? "")) : undefined;

  if (variant === "donut") {
    return (
      <DonutChartCard
        title={title}
        data={rows}
        valueFormatter={fmt}
        height={260}
        onItemClick={handleClick}
      />
    );
  }
  return (
    <BarChartCard
      title={title}
      data={rows}
      valueFormatter={fmt}
      tickFormatter={tickFmt}
      height={260}
      onItemClick={handleClick}
    />
  );
}

export default function QuadroColaboradoresPage() {
  const today = new Date();
  const [dataRef, setDataRef] = useState<Date>(today);
  const [anomesIni, setAnomesIni] = useState<string>(janOfYear(today));
  const [anomesFim, setAnomesFim] = useState<string>(toAnomes(today));
  const [exportando, setExportando] = useState(false);
  const [drill, setDrill] = useState<{ open: boolean; label: string; valor: string; itens: ColaboradorDetalhe[] }>({
    open: false, label: "", valor: "", itens: [],
  });
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
  const listaQ = useQuery({
    queryKey: ["rh", "quadro-lista"],
    queryFn: () => fetchQuadroColaboradores(),
    staleTime: 60_000,
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

  const detalhe = dashQ.data?.detalhe ?? [];
  const temDetalhe = detalhe.length > 0;

  const faixaSexoData = useMemo(() => {
    if (!temDetalhe) return [] as { faixa: string; homens: number; mulheres: number; outros: number; total: number }[];
    const ORDEM = [
      "ATE 20 ANOS", "ATE 25 ANOS", "ATE 30 ANOS", "ATE 35 ANOS", "ATE 40 ANOS",
      "ATE 45 ANOS", "ATE 50 ANOS", "ATE 60 ANOS", "MAIS DE 60 ANOS",
    ];
    const norm = (s: any) => String(s ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().trim();
    const sexoBucket = (s: any): "homens" | "mulheres" | "outros" => {
      const n = norm(s);
      if (!n) return "outros";
      if (n.startsWith("M")) return "homens";
      if (n.startsWith("F")) return "mulheres";
      return "outros";
    };
    const map = new Map<string, { faixa: string; homens: number; mulheres: number; outros: number }>();
    for (const c of detalhe) {
      const faixa = String(c.faixa_etaria ?? "").trim() || "—";
      const key = faixa;
      const cur = map.get(key) ?? { faixa, homens: 0, mulheres: 0, outros: 0 };
      cur[sexoBucket(c.sexo)] += 1;
      map.set(key, cur);
    }
    const arr = Array.from(map.values()).map((r) => ({ ...r, total: r.homens + r.mulheres + r.outros }));
    arr.sort((a, b) => {
      const ia = ORDEM.indexOf(norm(a.faixa));
      const ib = ORDEM.indexOf(norm(b.faixa));
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.faixa.localeCompare(b.faixa, "pt-BR");
    });
    return arr;
  }, [detalhe, temDetalhe]);

  const temOutros = useMemo(() => faixaSexoData.some((r) => r.outros > 0), [faixaSexoData]);

  const tempoCasaSexoData = useMemo(() => {
    if (!temDetalhe) return [] as { faixa: string; homens: number; mulheres: number }[];
    const ORDEM = [
      "MENOS DE 1 ANO", "DE 1 A 2 ANOS", "DE 2 A 3 ANOS",
      "DE 3 A 5 ANOS", "DE 5 A 8 ANOS", "MAIS DE 8 ANOS",
    ];
    const norm = (s: any) => String(s ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().trim();
    const sexoM = (s: any) => norm(s).startsWith("M");
    const sexoF = (s: any) => norm(s).startsWith("F");
    const map = new Map<string, { faixa: string; homens: number; mulheres: number }>();
    for (const c of detalhe) {
      const faixa = String(c.tempo_casa ?? "").trim() || "—";
      const cur = map.get(faixa) ?? { faixa, homens: 0, mulheres: 0 };
      if (sexoM(c.sexo)) cur.homens += 1;
      else if (sexoF(c.sexo)) cur.mulheres += 1;
      map.set(faixa, cur);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const ia = ORDEM.indexOf(norm(a.faixa));
      const ib = ORDEM.indexOf(norm(b.faixa));
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.faixa.localeCompare(b.faixa, "pt-BR");
    });
    return arr;
  }, [detalhe, temDetalhe]);


  function openDrill(label: string, valor: string, itens: ColaboradorDetalhe[]) {
    if (!itens || itens.length === 0) {
      toast.info("Sem colaboradores para este recorte.");
      return;
    }
    setDrill({ open: true, label, valor, itens });
  }

  function onKpiClick(kpiKey: string, title: string) {
    if (!temDetalhe) return;
    const itens = filterDetalheByKpi(detalhe, kpiKey);
    if (!itens) return;
    openDrill(title, title, itens);
  }


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
      <RhPageHeader
        title="02 — Quadro de Colaboradores"
        actions={
          <BotaoRelatorioModuloPdf
            modulo="quadro-colaboradores"
            titulo="Quadro de Colaboradores"
            disabled={listaQ.isLoading}
            dados={listaQ.data ? { tipo: "quadro-colaboradores", itens: listaQ.data } : null}
            filtros={{ outros: { "Data de referência": dataRef ? format(dataRef, "dd/MM/yyyy") : "-" } }}
            iaPayload={{ data_referencia: dataRefIso, kpis: dashQ.data?.kpis, total: listaQ.data?.length ?? 0, historico: histQ.data?.slice(-12) }}
          />
        }
      />

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
              onClick={temDetalhe ? () => onKpiClick(c.key, c.title) : undefined}
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
            tickFormatter={(v) => {
              const abs = Math.abs(v);
              if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
              if (abs >= 1_000) return `${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
              return new Intl.NumberFormat("pt-BR").format(v);
            }}
            height={280}
            visualConfig={{
              dataLabels: {
                visible: true,
                position: 'top',
                fontSize: 12,
                fontFamily: 'default',
                format: 'int',
                decimals: 0,
                prefix: '',
                suffix: '',
                richLabel: false,
                showName: false,
                showPercent: false,
              },
            }}
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
        <BreakdownCard title="Sexo" data={dashQ.data?.sexo} variant="donut" loading={dashQ.isLoading}
          onItemClick={temDetalhe ? (label) => openDrill("Sexo", label, filterDetalheBySexoLabel(detalhe, label)) : undefined} />
        <BreakdownCard title="Situação / Afastamento" data={dashQ.data?.situacao} loading={dashQ.isLoading}
          onItemClick={temDetalhe ? (label) => openDrill("Situação", label, filterDetalheByDimensao(detalhe, "situacao", label)) : undefined} />
        <BreakdownCard title="Vínculo" data={dashQ.data?.vinculo} loading={dashQ.isLoading}
          onItemClick={temDetalhe ? (label) => openDrill("Vínculo", label, filterDetalheByDimensao(detalhe, "vinculo", label)) : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <BreakdownCard title="Escolaridade" data={dashQ.data?.escolaridade} loading={dashQ.isLoading}
          onItemClick={temDetalhe ? (label) => openDrill("Escolaridade", label, filterDetalheByDimensao(detalhe, "escolaridade", label)) : undefined} />
        <BreakdownCard title="Faixa etária" data={dashQ.data?.faixa_etaria} sort={false} loading={dashQ.isLoading}
          onItemClick={temDetalhe ? (label) => openDrill("Faixa etária", label, filterDetalheByDimensao(detalhe, "faixa_etaria", label)) : undefined} />
      </div>

      <div className="mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Faixa Etária × Sexo</CardTitle>
          </CardHeader>
          <CardContent>
            {dashQ.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : faixaSexoData.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={faixaSexoData} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    formatter={(v: number) => new Intl.NumberFormat("pt-BR").format(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="homens" name="Homens" stackId="s"
                    fill="hsl(var(--muted-foreground))" fillOpacity={0.75}
                    cursor="pointer"
                    onClick={(d: any) => {
                      const faixa = d?.payload?.faixa;
                      openDrill("Faixa etária × Homens", `${faixa} · Homens`,
                        detalhe.filter((c) => {
                          const s = String(c.sexo ?? "").trim().toUpperCase();
                          return String(c.faixa_etaria ?? "").trim() === faixa && s.startsWith("M");
                        }));
                    }}
                  >
                    <LabelList dataKey="homens" position="center" style={{ fontSize: 11, fill: "hsl(var(--background))", fontWeight: 600 }} formatter={(v: number) => (v ? v : "")} />
                  </Bar>
                  <Bar
                    dataKey="mulheres" name="Mulheres" stackId="s"
                    fill="hsl(var(--warning))"
                    cursor="pointer"
                    onClick={(d: any) => {
                      const faixa = d?.payload?.faixa;
                      openDrill("Faixa etária × Mulheres", `${faixa} · Mulheres`,
                        detalhe.filter((c) => {
                          const s = String(c.sexo ?? "").trim().toUpperCase();
                          return String(c.faixa_etaria ?? "").trim() === faixa && s.startsWith("F");
                        }));
                    }}
                  >
                    <LabelList dataKey="mulheres" position="center" style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }} formatter={(v: number) => (v ? v : "")} />
                    <LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }} formatter={(v: number) => (v ? v : "")} />
                  </Bar>
                  {temOutros && (
                    <Bar
                      dataKey="outros" name="Outros" stackId="s"
                      fill="hsl(var(--muted))"
                      cursor="pointer"
                    >
                      <LabelList dataKey="outros" position="center" style={{ fontSize: 11, fill: "hsl(var(--foreground))" }} formatter={(v: number) => (v ? v : "")} />
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>



      <div className="mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tempo de Casa × Sexo</CardTitle>
          </CardHeader>
          <CardContent>
            {dashQ.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : tempoCasaSexoData.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tempoCasaSexoData} margin={{ top: 24, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    formatter={(v: number) => new Intl.NumberFormat("pt-BR").format(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="homens" name="Homens"
                    fill="hsl(var(--muted-foreground))" fillOpacity={0.75}
                    cursor="pointer"
                    onClick={(d: any) => {
                      const faixa = d?.payload?.faixa;
                      openDrill("Tempo de casa × Homens", `${faixa} · Homens`,
                        detalhe.filter((c) => {
                          const s = String(c.sexo ?? "").trim().toUpperCase();
                          return String(c.tempo_casa ?? "").trim() === faixa && s.startsWith("M");
                        }));
                    }}
                  >
                    <LabelList dataKey="homens" position="top" style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }} formatter={(v: number) => (v ? v : "")} />
                  </Bar>
                  <Bar
                    dataKey="mulheres" name="Mulheres"
                    fill="hsl(var(--warning))"
                    cursor="pointer"
                    onClick={(d: any) => {
                      const faixa = d?.payload?.faixa;
                      openDrill("Tempo de casa × Mulheres", `${faixa} · Mulheres`,
                        detalhe.filter((c) => {
                          const s = String(c.sexo ?? "").trim().toUpperCase();
                          return String(c.tempo_casa ?? "").trim() === faixa && s.startsWith("F");
                        }));
                    }}
                  >
                    <LabelList dataKey="mulheres" position="top" style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }} formatter={(v: number) => (v ? v : "")} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">

        <BreakdownCard title="Tempo de casa" data={dashQ.data?.tempo_casa} sort={false} loading={dashQ.isLoading}
          onItemClick={temDetalhe ? (label) => openDrill("Tempo de casa", label, filterDetalheByDimensao(detalhe, "tempo_casa", label)) : undefined} />
        <FilialTable data={dashQ.data?.filial} loading={dashQ.isLoading}
          onRowClick={temDetalhe ? (label) => openDrill("Filial", label, filterDetalheByDimensao(detalhe, "filial", label)) : undefined} />
      </div>

      <div className="mb-4">
        <EmpresaGrid
          data={dashQ.data?.empresa_detalhado ?? undefined}
          fallback={dashQ.data?.empresa ?? undefined}
          loading={dashQ.isLoading}
          hasResponse={!!dashQ.data}
          onRowClick={temDetalhe ? (empresa) => openDrill("Empresa", empresa, filterDetalheByDimensao(detalhe, "empresa", empresa)) : undefined}
        />
      </div>

      <div className="mb-4">
        <QuadroDrillCard
          dimensoes={dashQ.data?.dimensoes_drill ?? []}
          detalhe={dashQ.data?.detalhe ?? []}
          loading={dashQ.isLoading}
        />
      </div>

      <QuadroDrillModal
        open={drill.open}
        onOpenChange={(v) => setDrill((d) => ({ ...d, open: v }))}
        label={drill.label}
        valor={drill.valor}
        itens={drill.itens}
      />

      <AiInsightsPanel
        modulo="quadro-colaboradores"
        ready={!dashQ.isLoading && !!dashQ.data}
        payload={{
          data_ref: dataRefIso,
          periodo_historico: { anomes_ini: anomesIni, anomes_fim: anomesFim },
          kpis,
          historico_mensal: historicoData,
          distribuicao_faixa_sexo: faixaSexoData,
          distribuicao_tempo_casa_sexo: tempoCasaSexoData,
          dimensoes_drill: (dashQ.data?.dimensoes_drill ?? []).slice(0, 8).map((d: any) => ({
            dimensao: d?.dimensao ?? d?.label,
            top: (d?.itens ?? d?.valores ?? []).slice(0, 8),
          })),
          total_colaboradores: detalhe.length,
        }}
      />
    </div>
  );
}


const EMPRESA_COLS: { key: keyof QuadroEmpresaLinha; label: string }[] = [
  { key: "colaboradores", label: "Colaboradores" },
  { key: "trabalhando", label: "Trabalhando" },
  { key: "admitidos", label: "Admitidos" },
  { key: "demitidos", label: "Demitidos" },
  { key: "pcd", label: "PCD" },
  { key: "estagiarios", label: "Estagiários" },
  { key: "jovem_aprendiz", label: "Jovem Aprendiz" },
  { key: "ferias", label: "Férias" },
  { key: "aposentadoria_invalidez", label: "Aposent. Invalidez" },
  { key: "auxilio_doenca", label: "Auxílio Doença" },
  { key: "acidente_trabalho", label: "Acidente Trabalho" },
  { key: "atestados", label: "Atestados" },
  { key: "licenca_maternidade", label: "Licença Maternidade" },
  { key: "homens", label: "Homens" },
  { key: "mulheres", label: "Mulheres" },
];

function EmpresaGrid({
  data,
  fallback,
  loading,
  hasResponse,
  onRowClick,
}: {
  data?: QuadroEmpresaLinha[];
  fallback?: QuadroBreakdown;
  loading?: boolean;
  hasResponse?: boolean;
  onRowClick?: (empresa: string) => void;
}) {
  const rows = useMemo<QuadroEmpresaLinha[]>(() => {
    if (data && data.length > 0) {
      return [...data].sort((a, b) => (b.colaboradores ?? 0) - (a.colaboradores ?? 0));
    }
    if (fallback && fallback.length > 0) {
      return [...fallback]
        .sort((a, b) => b.valor - a.valor)
        .map((f) => ({ empresa: f.label, colaboradores: f.valor }));
    }
    return [];
  }, [data, fallback]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Empresa</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-56 w-full" /></CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    if (!hasResponse) return null;
    return (
      <Card className="border-warning/40">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Empresa</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-warning">Classificação Empresa pendente de regra na API</p>
        </CardContent>
      </Card>
    );
  }

  const fmt = (v: number | null | undefined) =>
    typeof v === "number" ? new Intl.NumberFormat("pt-BR").format(v) : "—";

  const totals = EMPRESA_COLS.reduce<Record<string, number | null>>((acc, c) => {
    const nums = rows.map((r) => r[c.key]).filter((v): v is number => typeof v === "number");
    acc[c.key as string] = nums.length > 0 ? nums.reduce((s, n) => s + n, 0) : null;
    return acc;
  }, {});

  const temMontagemExterna = rows.some((r) =>
    String(r.empresa ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .includes("MONTAGEM EXTERNA"),
  );

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Empresa</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                {EMPRESA_COLS.map((c) => (
                  <TableHead key={c.key as string} className="text-right whitespace-nowrap">{c.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow
                  key={i}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                  onClick={onRowClick ? () => onRowClick(String(r.empresa ?? "")) : undefined}
                >
                  <TableCell className="font-medium whitespace-nowrap">{r.empresa}</TableCell>
                  {EMPRESA_COLS.map((c) => (
                    <TableCell key={c.key as string} className="text-right tabular-nums">
                      {fmt(r[c.key] as number | null | undefined)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell>Total</TableCell>
                {EMPRESA_COLS.map((c) => (
                  <TableCell key={c.key as string} className="text-right tabular-nums">
                    {fmt(totals[c.key as string])}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
        {!temMontagemExterna && (
          <p className="text-xs text-muted-foreground mt-2">
            Montagem Externa pendente de regra na API.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FilialTable({ data, loading, onRowClick }: { data?: QuadroBreakdown; loading?: boolean; onRowClick?: (label: string) => void }) {
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
                <TableRow
                  key={i}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                  onClick={onRowClick ? () => onRowClick(r.label) : undefined}
                >
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
