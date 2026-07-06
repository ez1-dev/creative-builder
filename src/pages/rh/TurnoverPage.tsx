import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { UserPlus, UserMinus, TrendingUp, Percent, Users, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { AnomesSelect } from "@/components/bi/comercial/AnomesSelect";
import { TurnoverDrillModal } from "@/components/rh/TurnoverDrillModal";
import { TurnoverEmpresaDrillModal } from "@/components/rh/TurnoverEmpresaDrillModal";
import { fetchTurnoverDashboard } from "@/lib/rh/api";
import type {
  TurnoverAdmitidoDetalhe, TurnoverDemitidoDetalhe,
} from "@/lib/rh/types";
import { cn } from "@/lib/utils";

const codemp = 1;

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
  const [iniDraft, setIniDraft] = useState(initRange.ini);
  const [fimDraft, setFimDraft] = useState(initRange.fim);
  const [ini, setIni] = useState(initRange.ini);
  const [fim, setFim] = useState(initRange.fim);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["rh", "turnover", ini, fim, codemp],
    queryFn: () => fetchTurnoverDashboard({ anomes_ini: ini, anomes_fim: fim, codemp }),
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

  const atualizar = () => { setIni(iniDraft); setFim(fimDraft); refetch(); };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <RhPageHeader title="RH-05 — Rotatividade / Turnover" />

      <Card>
        <CardContent className="pt-4 flex flex-wrap items-end gap-3">
          <AnomesSelect label="Mês inicial" value={iniDraft} onChange={setIniDraft} className="w-52" />
          <AnomesSelect label="Mês final" value={fimDraft} onChange={setFimDraft} className="w-52" />
          <Button onClick={atualizar} disabled={isFetching}>Atualizar</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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

      {/* Gráfico */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Admissões x Demissões por Mês
          </h2>
          {isLoading ? (
            <Skeleton className="h-72" />
          ) : chartData.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                />
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Motivos */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Motivos de Desligamento
            </h2>
            <div className="max-h-[50vh] overflow-auto">
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

        {/* Por Empresa */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Por Empresa
            </h2>
            <div className="max-h-[50vh] overflow-auto">
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
      </div>

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
    </div>
  );
}
