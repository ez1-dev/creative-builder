import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { UserPlus, UserMinus, TrendingUp, Percent, Users, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { AiInsightsPanel } from "@/components/rh/AiInsightsPanel";
import { BotaoRelatorioModuloPdf } from "@/components/rh/BotaoRelatorioModuloPdf";
import { RhFiltrosBar } from "@/components/rh/RhFiltrosBar";
import { RhDashboardWithBiLibrary } from "@/components/rh/RhDashboardWithBiLibrary";
import { buildTurnoverSeries } from "@/lib/rh/seriesBuilders";
import { RhLayoutToolbar } from "@/components/rh/RhLayoutToolbar";
import { useRhModuleLayout } from "@/hooks/useRhModuleLayout";
import { TURNOVER_DEFAULTS, TURNOVER_CATALOG } from "@/lib/rh/widgetCatalogs";
import { addMonths } from "@/lib/rh/relatorio";
import { TurnoverDrillModal } from "@/components/rh/TurnoverDrillModal";
import { TurnoverEmpresaDrillModal } from "@/components/rh/TurnoverEmpresaDrillModal";
import { fetchTurnoverDashboardCached } from "@/lib/rh/api";
import type {
  TurnoverAdmitidoDetalhe, TurnoverDemitidoDetalhe,
} from "@/lib/rh/types";
import { cn } from "@/lib/utils";

function formatAnoMes(anomes?: string | number | null) {
  if (!anomes) return "-";
  const s = String(anomes);
  if (!/^\d{6}$/.test(s)) return s;
  return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
}
function getAnoMesFromDate(s?: string | null) {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}${m[2]}` : "";
}
const formatInt = (n?: number | null) =>
  (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const formatPct2 = (n?: number | null) =>
  `${(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const formatDec1 = (n?: number | null) =>
  (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

function currentYearRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return { ini: `${y}01`, fim: `${y}${m}` };
}

export default function TurnoverPage() {
  const initRange = currentYearRange();
  const [ini, setIni] = useState(initRange.ini);
  const [fim, setFim] = useState(initRange.fim);
  const [codemp, setCodemp] = useState<number>(1);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["rh", "turnover", ini, fim, codemp],
    queryFn: () => fetchTurnoverDashboardCached({ anomes_ini: ini, anomes_fim: fim, codemp }),
    staleTime: 2 * 60_000, gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!error) return;
    const err = error as any;
    const status = err?.status ?? err?.statusCode ?? err?.response?.status;
    if (status === 401) toast.error("Sessão expirada. Faça login novamente.");
    else toast.error("Não foi possível carregar Turnover.");
  }, [error]);

  const kpis = data?.kpis;
  const porMes = data?.por_mes ?? [];
  const porMotivo = useMemo(
    () => [...(data?.por_motivo ?? [])].sort((a, b) => (b.qtd || 0) - (a.qtd || 0)),
    [data?.por_motivo],
  );
  const porEmpresa = useMemo(
    () => [...(data?.por_empresa ?? [])].sort(
      (a, b) => (b.admitidos + b.demitidos) - (a.admitidos + a.demitidos),
    ),
    [data?.por_empresa],
  );
  const detAdm = data?.detalhe_admitidos ?? [];
  const detDem = data?.detalhe_demitidos ?? [];

  const chartData = useMemo(
    () => porMes.map((r) => ({ ...r, label: formatAnoMes(r.anomes) })),
    [porMes],
  );

  // Drills
  const [drillTipo, setDrillTipo] = useState<"admitidos" | "demitidos" | null>(null);
  const [drillTitulo, setDrillTitulo] = useState("");
  const [drillItens, setDrillItens] = useState<any[]>([]);
  const openAdm = (titulo: string, itens: TurnoverAdmitidoDetalhe[]) => {
    setDrillTipo("admitidos"); setDrillTitulo(titulo); setDrillItens(itens);
  };
  const openDem = (titulo: string, itens: TurnoverDemitidoDetalhe[]) => {
    setDrillTipo("demitidos"); setDrillTitulo(titulo); setDrillItens(itens);
  };

  const [empresaDrill, setEmpresaDrill] = useState<string | null>(null);
  const empresaAdm = empresaDrill ? detAdm.filter((x) => x.empresa === empresaDrill) : [];
  const empresaDem = empresaDrill ? detDem.filter((x) => x.empresa === empresaDrill) : [];

  const saldoNeg = (kpis?.saldo ?? 0) < 0;

  const layout = useRhModuleLayout("rh-turnover", TURNOVER_DEFAULTS);

  return (
    <div className="container mx-auto px-3 md:px-6 py-4 md:py-6 space-y-3 md:space-y-4">
      <RhPageHeader
        title="05 — Turnover"
        subtitle="Admissões, demissões e taxa de rotatividade"
        actions={
          <>
            <RhLayoutToolbar
              editing={layout.editing}
              onToggle={layout.setEditing}
              onReset={layout.resetLayout}
              widgets={layout.widgets}
              onShow={layout.showWidget}
              pageKey="rh-turnover"
              onAdd={layout.addWidget}
              onCommit={layout.commitEdits}
              onCancel={layout.cancelEdits}
              hasPendingChanges={layout.hasPendingChanges}
            />
            <BotaoRelatorioModuloPdf
              modulo="turnover"
              titulo="Rotatividade / Turnover"
              disabled={isLoading}
              dados={data ? { tipo: "turnover", atual: data } : null}
              filtros={{ anomes_ini: ini, anomes_fim: fim, codemp }}
              iaPayload={{ periodo: { anomes_ini: ini, anomes_fim: fim }, kpis: data?.kpis, por_mes: data?.por_mes, por_motivo: data?.por_motivo, por_empresa: data?.por_empresa }}
              carregarAnterior={async () => {
                const len = (parseInt(fim.slice(0, 4)) * 12 + parseInt(fim.slice(4, 6))) - (parseInt(ini.slice(0, 4)) * 12 + parseInt(ini.slice(4, 6))) + 1;
                return fetchTurnoverDashboardCached({ anomes_ini: addMonths(ini, -len), anomes_fim: addMonths(ini, -1), codemp });
              }}
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


      {(() => {
        const blocks: Record<string, React.ReactNode> = {
          "kpis-turnover": (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 h-full">
              <KpiCard
                title="Admitidos"
                value={kpis?.admitidos ?? 0}
                format="number"
                variant="success"
                icon={<UserPlus className="h-4 w-4" />}
                loading={isLoading}
                onClick={() => openAdm("Admitidos", detAdm)}
              />
              <KpiCard
                title="Demitidos"
                value={kpis?.demitidos ?? 0}
                format="number"
                variant="danger"
                icon={<UserMinus className="h-4 w-4" />}
                loading={isLoading}
                onClick={() => openDem("Demitidos", detDem)}
              />
              <KpiCard
                title="Saldo"
                value={kpis?.saldo ?? 0}
                format="number"
                variant={saldoNeg ? "danger" : "success"}
                icon={<TrendingUp className="h-4 w-4" />}
                loading={isLoading}
              />
              <KpiCard
                title="Taxa Rotatividade"
                value={formatPct2(kpis?.taxa_rotatividade_pct)}
                format="raw"
                variant="warning"
                icon={<Percent className="h-4 w-4" />}
                loading={isLoading}
              />
              <KpiCard
                title="Headcount Médio"
                value={formatDec1(kpis?.headcount_medio)}
                format="raw"
                variant="info"
                icon={<Users className="h-4 w-4" />}
                loading={isLoading}
              />
              <Card className="border-l-4 border-l-[hsl(var(--info,215_70%_45%))]">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Headcount</span>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-10 mt-2" />
                  ) : (
                    <div className="mt-2 space-y-0.5">
                      <div className="text-sm"><span className="text-muted-foreground">Início:</span> <span className="font-semibold tabular-nums">{formatInt(kpis?.headcount_inicio)}</span></div>
                      <div className="text-sm"><span className="text-muted-foreground">Fim:</span> <span className="font-semibold tabular-nums">{formatInt(kpis?.headcount_fim)}</span></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ),
          "serie-turnover": (
            <Card className="h-full">
              <CardContent className="pt-6 h-full flex flex-col">
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Admissões vs. Demissões por Mês
                </h2>
                <div className="flex-1 min-h-0">
                  {isLoading ? (
                    <Skeleton className="h-full min-h-[200px]" />
                  ) : chartData.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Sem dados</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar
                          dataKey="admitidos" name="Admitidos" fill="hsl(var(--success))" cursor="pointer"
                          onClick={(d: any) => {
                            const anomes = d?.payload?.anomes;
                            openAdm(`Admitidos ${formatAnoMes(anomes)}`,
                              detAdm.filter((x) => getAnoMesFromDate(x.dt_admissao) === anomes));
                          }}
                        />
                        <Bar
                          dataKey="demitidos" name="Demitidos" fill="hsl(var(--destructive))" cursor="pointer"
                          onClick={(d: any) => {
                            const anomes = d?.payload?.anomes;
                            openDem(`Demitidos ${formatAnoMes(anomes)}`,
                              detDem.filter((x) => getAnoMesFromDate(x.dt_demissao) === anomes));
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          ),
          "motivos-turnover": (
            <Card className="h-full">
              <CardContent className="pt-6">
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Motivos de Desligamento
                </h2>
                <div className="max-h-[calc(100%-2rem)] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>Motivo</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={2}><Skeleton className="h-6" /></TableCell></TableRow>
                      ))}
                      {!isLoading && porMotivo.length === 0 && (
                        <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
                      )}
                      {porMotivo.map((r, i) => (
                        <TableRow
                          key={i}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openDem(`Demitidos — ${r.motivo}`,
                            detDem.filter((x) => x.motivo === r.motivo))}
                        >
                          <TableCell>{r.motivo}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatInt(r.qtd)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ),
          "empresa-turnover": (
            <Card className="h-full">
              <CardContent className="pt-6">
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Turnover por Empresa
                </h2>
                <div className="max-h-[calc(100%-2rem)] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead className="text-right">Admitidos</TableHead>
                        <TableHead className="text-right">Demitidos</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-6" /></TableCell></TableRow>
                      ))}
                      {!isLoading && porEmpresa.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
                      )}
                      {porEmpresa.map((r, i) => {
                        const saldo = (r.admitidos || 0) - (r.demitidos || 0);
                        return (
                          <TableRow
                            key={i}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setEmpresaDrill(r.label)}
                          >
                            <TableCell>{r.label}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatInt(r.admitidos)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatInt(r.demitidos)}</TableCell>
                            <TableCell className={cn("text-right tabular-nums font-medium",
                              saldo < 0 ? "text-destructive" : "text-[hsl(var(--success))]")}>
                              {formatInt(saldo)}
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
        };
        return (
          <RhDashboardWithBiLibrary
            pageKey="rh-turnover"
            layout={layout}
            blocks={blocks}
            catalog={TURNOVER_CATALOG}
            kpis={kpis as any}
            series={(data as any)?.series}
            derivedSeries={buildTurnoverSeries(data)}
            filtros={{ codemp, anomes_ini: ini, anomes_fim: fim }}
          />
        );
      })()}


      <TurnoverDrillModal
        open={drillTipo !== null}
        onOpenChange={(v) => { if (!v) setDrillTipo(null); }}
        titulo={drillTitulo}
        tipo={drillTipo ?? "admitidos"}
        itens={drillItens}
      />

      <TurnoverEmpresaDrillModal
        open={empresaDrill !== null}
        onOpenChange={(v) => { if (!v) setEmpresaDrill(null); }}
        empresa={empresaDrill ?? ""}
        admitidos={empresaAdm}
        demitidos={empresaDem}
      />

      <AiInsightsPanel
        modulo="turnover"
        ready={!isLoading && !!data}
        payload={{
          periodo: { anomes_ini: ini, anomes_fim: fim },
          kpis,
          serie_mensal: chartData.map((r: any) => ({
            anomes: r.anomes,
            admitidos: r.admitidos,
            demitidos: r.demitidos,
          })),
          top_motivos: porMotivo.slice(0, 10),
          por_empresa: porEmpresa.slice(0, 10).map((r) => ({
            empresa: r.label,
            admitidos: r.admitidos,
            demitidos: r.demitidos,
            saldo: (r.admitidos || 0) - (r.demitidos || 0),
          })),
        }}
      />
    </div>
  );
}
