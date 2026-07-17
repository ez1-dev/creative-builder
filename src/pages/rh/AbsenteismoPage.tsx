import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Activity, AlertOctagon, Users, CalendarDays, Clock, TrendingDown, FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { BotaoRelatorioModuloPdf } from "@/components/rh/BotaoRelatorioModuloPdf";
import { RhFiltrosBar } from "@/components/rh/RhFiltrosBar";
import { RhDashboardWithBiLibrary } from "@/components/rh/RhDashboardWithBiLibrary";
import { buildAbsenteismoSeries } from "@/lib/rh/seriesBuilders";
import { RhLayoutToolbar } from "@/components/rh/RhLayoutToolbar";
import { useRhModuleLayout } from "@/hooks/useRhModuleLayout";
import { ABSENTEISMO_DEFAULTS, ABSENTEISMO_CATALOG } from "@/lib/rh/widgetCatalogs";
import { addMonths } from "@/lib/rh/relatorio";
import { AbsenteismoDrillModal } from "@/components/rh/AbsenteismoDrillModal";
import { AiInsightsPanel } from "@/components/rh/AiInsightsPanel";
import {
  fetchAbsenteismoDashboardCached,
  getAbsenteismoExportUrl,
} from "@/lib/rh/api";
import type { AbsenteismoDetalheItem } from "@/lib/rh/types";
import { cn } from "@/lib/utils";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--info, 215 70% 45%))",
  "hsl(var(--accent))",
  "hsl(var(--muted-foreground))",
];

const formatAnoMes = (anomes?: string | number | null) => {
  if (!anomes) return "-";
  const s = String(anomes);
  if (!/^\d{6}$/.test(s)) return s;
  return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
};

const getAnoMesFromDate = (s?: string | null) => {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}${m[2]}` : "";
};

const fmtInt = (n?: number | null) =>
  (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmtDec1 = (n?: number | null) =>
  (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const fmtPct2 = (n?: number | null) =>
  `${(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

function currentYearRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return { ini: `${y}01`, fim: `${y}${m}` };
}

export default function AbsenteismoPage() {
  const initRange = currentYearRange();
  const [ini, setIni] = useState(initRange.ini);
  const [fim, setFim] = useState(initRange.fim);
  const [codemp, setCodemp] = useState<number>(1);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["rh", "absenteismo", ini, fim, codemp],
    queryFn: () =>
      fetchAbsenteismoDashboardCached({ anomes_ini: ini, anomes_fim: fim, codemp }),
    staleTime: 2 * 60_000, gcTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!error) return;
    const err = error as any;
    const status = err?.status ?? err?.statusCode ?? err?.response?.status;
    if (status === 401) toast.error("Sessão expirada. Faça login novamente.");
    else toast.error("Não foi possível carregar Absenteísmo.");
  }, [error]);

  const kpis = data?.kpis;
  const porMes = data?.por_mes ?? [];
  const porCategoria = data?.por_categoria ?? [];
  const porEmpresa = useMemo(
    () => [...(data?.por_empresa ?? [])].sort((a, b) => (b.dias || 0) - (a.dias || 0)),
    [data?.por_empresa],
  );
  const porMotivo = useMemo(
    () => [...(data?.por_motivo ?? [])].sort((a, b) => (b.dias || 0) - (a.dias || 0)),
    [data?.por_motivo],
  );
  const detalhe = useMemo(() => data?.detalhe ?? [], [data?.detalhe]);

  const chartMes = useMemo(
    () => porMes.map((r) => ({ ...r, label: formatAnoMes(r.anomes) })),
    [porMes],
  );
  const chartCategoria = useMemo(
    () => [...porCategoria].sort((a, b) => (b.dias || 0) - (a.dias || 0)),
    [porCategoria],
  );

  const [drill, setDrill] = useState<{ titulo: string; itens: AbsenteismoDetalheItem[] } | null>(null);
  const openDrill = (titulo: string, itens: AbsenteismoDetalheItem[]) =>
    setDrill({ titulo, itens });

  const exportar = () => {
    const url = getAbsenteismoExportUrl({ anomes_ini: ini, anomes_fim: fim, codemp });
    const a = document.createElement("a");
    a.href = url;
    a.download = `rh_06_absenteismo_${ini}_${fim}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const layout = useRhModuleLayout("rh-absenteismo", ABSENTEISMO_DEFAULTS);

  return (
    <div className="container mx-auto px-3 md:px-6 py-4 md:py-6 space-y-3 md:space-y-4">
      <RhPageHeader
        title="06 — Absenteísmo"
        subtitle="Afastamentos, dias perdidos e taxa de absenteísmo"
        actions={
          <div className="flex items-center gap-2">
            <RhLayoutToolbar
              editing={layout.editing}
              onToggle={layout.setEditing}
              onReset={layout.resetLayout}
              widgets={layout.widgets}
              onShow={layout.showWidget}
              pageKey="rh-absenteismo"
              onAdd={layout.addWidget}
              onCommit={layout.commitEdits}
              onCancel={layout.cancelEdits}
              hasPendingChanges={layout.hasPendingChanges}
            />
            <Button variant="outline" size="sm" onClick={exportar} disabled={isLoading}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel
            </Button>
            <BotaoRelatorioModuloPdf
              modulo="absenteismo"
              titulo="Absenteísmo / Afastamentos"
              disabled={isLoading}
              dados={data ? { tipo: "absenteismo", atual: data } : null}
              filtros={{ anomes_ini: ini, anomes_fim: fim, codemp }}
              iaPayload={{ periodo: { anomes_ini: ini, anomes_fim: fim }, kpis: data?.kpis, por_categoria: data?.por_categoria, por_motivo: data?.por_motivo, por_mes: data?.por_mes, por_empresa: data?.por_empresa }}
              carregarAnterior={async () => {
                const len = (parseInt(fim.slice(0, 4)) * 12 + parseInt(fim.slice(4, 6))) - (parseInt(ini.slice(0, 4)) * 12 + parseInt(ini.slice(4, 6))) + 1;
                return fetchAbsenteismoDashboardCached({ anomes_ini: addMonths(ini, -len), anomes_fim: addMonths(ini, -1), codemp });
              }}
            />
          </div>
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


      {(() => {
        const blocks: Record<string, React.ReactNode> = {
          "kpis-abs": (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 h-full">
              <KpiCard title="Taxa de Absenteísmo" value={fmtPct2(kpis?.taxa_absenteismo_pct)} format="raw" variant="danger" icon={<TrendingDown className="h-4 w-4" />} loading={isLoading} />
              <KpiCard title="Afastamentos" value={kpis?.afastamentos ?? 0} format="number" variant="warning" icon={<AlertOctagon className="h-4 w-4" />} loading={isLoading} onClick={() => openDrill("Absenteísmo", detalhe)} />
              <KpiCard title="Colaboradores Afastados" value={kpis?.colaboradores_afastados ?? 0} format="number" variant="info" icon={<Users className="h-4 w-4" />} loading={isLoading} onClick={() => openDrill("Colaboradores Afastados", detalhe)} />
              <KpiCard title="Dias Perdidos" value={fmtDec1(kpis?.dias_perdidos)} format="raw" variant="danger" icon={<CalendarDays className="h-4 w-4" />} loading={isLoading} onClick={() => openDrill("Dias Perdidos", detalhe)} />
              <KpiCard title="Duração Média" value={`${fmtDec1(kpis?.duracao_media_dias)} dias`} format="raw" icon={<Clock className="h-4 w-4" />} loading={isLoading} />
              <KpiCard title="Headcount Médio" value={fmtDec1(kpis?.headcount_medio)} format="raw" variant="info" icon={<Activity className="h-4 w-4" />} loading={isLoading} />
            </div>
          ),
          "serie-abs": (
            <Card className="h-full">
              <CardContent className="pt-6 h-full flex flex-col">
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Evolução Mensal</h2>
                <div className="flex-1 min-h-0">
                  {isLoading ? (
                    <Skeleton className="h-full min-h-[200px]" />
                  ) : chartMes.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Sem dados</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartMes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar
                          yAxisId="left" dataKey="afastamentos" name="Afastamentos" fill="hsl(var(--primary))" cursor="pointer"
                          onClick={(d: any) => {
                            const anomes = d?.payload?.anomes;
                            openDrill(`Mês: ${formatAnoMes(anomes)}`, detalhe.filter((x) => getAnoMesFromDate(x.dt_inicio) === String(anomes)));
                          }}
                        />
                        <Line yAxisId="right" type="monotone" dataKey="dias" name="Dias" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          ),
          "categoria-abs": (
            <Card className="h-full">
              <CardContent className="pt-6 h-full flex flex-col">
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Por Categoria</h2>
                <div className="flex-1 min-h-0">
                  {isLoading ? (
                    <Skeleton className="h-full min-h-[200px]" />
                  ) : chartCategoria.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Sem dados</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                          formatter={(_v: any, _n: any, p: any) => {
                            const it = p?.payload;
                            return [
                              `${fmtInt(it?.dias)} dias · ${fmtInt(it?.afastamentos)} afast. · ${fmtInt(it?.colaboradores)} colab.`,
                              it?.categoria,
                            ];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Pie
                          data={chartCategoria} dataKey="dias" nameKey="categoria" cx="50%" cy="50%"
                          innerRadius={60} outerRadius={110} paddingAngle={2} cursor="pointer"
                          onClick={(d: any) => {
                            const cat = d?.payload?.categoria ?? d?.categoria;
                            if (!cat) return;
                            openDrill(`Categoria: ${cat}`, detalhe.filter((x) => x.categoria === cat));
                          }}
                        >
                          {chartCategoria.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          ),
          "empresa-abs": (
            <Card className="h-full">
              <CardContent className="pt-6">
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Por Empresa</h2>
                <div className="max-h-[calc(100%-2rem)] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead className="text-right">Afastamentos</TableHead>
                        <TableHead className="text-right">Dias</TableHead>
                        <TableHead className="text-right">Colaboradores</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-6" /></TableCell></TableRow>
                      ))}
                      {!isLoading && porEmpresa.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
                      )}
                      {porEmpresa.map((r, i) => (
                        <TableRow key={i} className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openDrill(`Empresa: ${r.label}`, detalhe.filter((x) => x.empresa === r.label))}>
                          <TableCell>{r.label}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtInt(r.afastamentos)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtInt(r.dias)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtInt(r.colaboradores)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ),
          "motivo-abs": (
            <Card className="h-full">
              <CardContent className="pt-6">
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Principais Motivos</h2>
                <div className="max-h-[calc(100%-2rem)] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="text-right">Cód.</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Absenteísmo?</TableHead>
                        <TableHead className="text-right">Afastamentos</TableHead>
                        <TableHead className="text-right">Dias</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6" /></TableCell></TableRow>
                      ))}
                      {!isLoading && porMotivo.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
                      )}
                      {porMotivo.map((r, i) => {
                        const isAbs = r.absenteismo === true;
                        return (
                          <TableRow key={`${r.codsit}-${i}`}
                            className={cn(isAbs ? "cursor-pointer hover:bg-muted/50" : "text-muted-foreground opacity-70")}
                            onClick={isAbs ? () => openDrill(`Motivo: ${r.motivo}`, detalhe.filter((x) => String(x.codsit) === String(r.codsit))) : undefined}>
                            <TableCell className="text-right tabular-nums">{r.codsit}</TableCell>
                            <TableCell>{r.motivo}</TableCell>
                            <TableCell>{r.categoria}</TableCell>
                            <TableCell>{isAbs ? "Sim" : "Não"}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtInt(r.afastamentos)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtInt(r.dias)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ),
        };
        return (
          <RhDashboardWithBiLibrary
            pageKey="rh-absenteismo"
            layout={layout}
            blocks={blocks}
            catalog={ABSENTEISMO_CATALOG}
            kpis={kpis as any}
            series={(data as any)?.series}
            derivedSeries={buildAbsenteismoSeries(data)}
            filtros={{ codemp, anomes_ini: ini, anomes_fim: fim }}
          />
        );
      })()}


      <AbsenteismoDrillModal
        open={drill !== null}
        onOpenChange={(v) => { if (!v) setDrill(null); }}
        titulo={drill?.titulo ?? ""}
        itens={drill?.itens ?? []}
      />

      <AiInsightsPanel
        modulo="absenteismo"
        ready={!isLoading && !!data}
        payload={{
          periodo: { anomes_ini: ini, anomes_fim: fim },
          kpis,
          serie_mensal: porMes,
          por_categoria: chartCategoria,
          top_motivos_absenteismo: porMotivo.filter((m) => m.absenteismo).slice(0, 10),
          top_empresas: porEmpresa.slice(0, 10),
          total_afastamentos_detalhe: detalhe.length,
        }}
      />
    </div>
  );
}
