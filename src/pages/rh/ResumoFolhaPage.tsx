import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import {
  fetchResumoFolhaConsolidado,
  toAnomes,
} from "@/lib/rh/api";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatHorasMin, formatCompetencia } from "@/lib/rh/eventoBuckets";

function defaultMonth(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info, 215 70% 45%))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--accent))",
];

export default function ResumoFolhaPage() {
  const [ini, setIni] = useState(defaultMonth(-5));
  const [fim, setFim] = useState(defaultMonth(0));
  const [filial, setFilial] = useState<string>("__all__");
  const [busca, setBusca] = useState("");

  const params = {
    anomes_ini: toAnomes(ini),
    anomes_fim: toAnomes(fim),
    filial: filial !== "__all__" ? filial : undefined,
    matricula: busca || undefined,
  };

  const query = useQuery({
    queryKey: ["rh", "resumo-folha-dashboard", params],
    queryFn: () => fetchResumoFolhaDashboard(params),
    enabled: !!params.anomes_ini && !!params.anomes_fim,
    retry: (count, err: any) => {
      if (err instanceof DashboardIndisponivelError) return false;
      return count < 1;
    },
  });

  const { data, isLoading, isError, error } = query;
  const indisponivel = error instanceof DashboardIndisponivelError;

  const kpis = data?.kpis;
  const filiaisData = data?.filiais ?? [];
  const proventos = data?.proventos_vantagens ?? [];
  const descontos = data?.descontos ?? [];
  const tipos = data?.tipos_evento ?? [];
  const mensal = data?.mensal ?? [];

  const filiaisOpts = useMemo(
    () => Array.from(new Set(filiaisData.map((f) => f.filial).filter(Boolean))),
    [filiaisData],
  );

  const totalProvento = useMemo(() => proventos.reduce((a, x) => a + (x.valor || 0), 0), [proventos]);
  const totalDesconto = useMemo(() => descontos.reduce((a, x) => a + (x.valor || 0), 0), [descontos]);

  const tiposPie = useMemo(() => {
    const total = tipos.reduce((a, t) => a + (t.valor || 0), 0) || 1;
    return tipos
      .map((t) => ({ ...t, pct: (t.valor || 0) / total }))
      .sort((a, b) => b.valor - a.valor);
  }, [tipos]);

  return (
    <div className="container mx-auto py-6 space-y-4">
      <RhPageHeader title="01 — Resumo Folha" subtitle="Painel consolidado da folha de pagamento" />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>Ano/mês inicial</Label><Input type="month" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
          <div><Label>Ano/mês final</Label><Input type="month" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          <div>
            <Label>Filial</Label>
            <Select value={filial} onValueChange={setFilial}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {filiaisOpts.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Matrícula / Colaborador</Label><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Busca..." /></div>
        </CardContent>
      </Card>

      {indisponivel && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <div className="font-medium">Endpoint de dashboard da folha ainda não disponível.</div>
          <div className="text-muted-foreground mt-1">
            O backend precisa expor <code>GET /api/rh/resumo-folha/dashboard?anomes_ini=YYYYMM&amp;anomes_fim=YYYYMM</code> retornando
            <code> kpis</code>, <code>proventos_vantagens</code>, <code>descontos</code>, <code>filiais</code> e <code>tipos_evento</code>.
          </div>
        </div>
      )}

      {isError && !indisponivel && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          Falha ao carregar dashboard da folha: {(error as any)?.message ?? "erro desconhecido"}
        </div>
      )}

      {!indisponivel && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Card className="md:row-span-2 border-l-4 border-l-primary">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Líquido</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-[11px] text-muted-foreground">Provento</div>
                  <div className="text-xl font-bold tabular-nums">{formatCurrency(kpis?.provento ?? 0)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Desconto</div>
                  <div className="text-xl font-bold tabular-nums text-destructive">{formatCurrency(kpis?.desconto ?? 0)}</div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-[11px] text-muted-foreground">Total Líquido</div>
                  <div className="text-2xl font-bold tabular-nums text-primary">{formatCurrency(kpis?.total_liquido ?? 0)}</div>
                </div>
              </CardContent>
            </Card>

            <KpiCard title="Custo Total" value={kpis?.custo_total ?? 0} format="currency" variant="danger" loading={isLoading} />
            <KpiCard title="Benefícios" value={kpis?.beneficios ?? 0} format="currency" loading={isLoading} />
            <KpiCard title="INSS Total" value={kpis?.inss_total ?? 0} format="currency" loading={isLoading} />
            <KpiCard title="Hora Extra" value={kpis?.hora_extra ?? 0} format="currency" variant="warning" loading={isLoading} />

            <KpiCard title="Provisões" value={kpis?.provisoes ?? 0} format="currency" loading={isLoading} />
            <KpiCard title="Custo das Férias" value={kpis?.custo_ferias ?? 0} format="currency" loading={isLoading} />
            <KpiCard title="Rescisões" value={kpis?.rescisoes ?? 0} format="currency" variant="warning" loading={isLoading} />
            <KpiCard title="FGTS" value={kpis?.fgts ?? 0} format="currency" loading={isLoading} />
          </div>

          {/* Gráficos + Top eventos */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Custo Hora Extra</CardTitle></CardHeader>
              <CardContent className="h-48">
                {mensal.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem série mensal</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mensal.map((m) => ({ ...m, competencia: formatCompetencia(m.competencia) }))}>
                      <XAxis dataKey="competencia" fontSize={10} />
                      <YAxis hide />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="custo_hora_extra" fill="hsl(var(--muted-foreground))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
              <CardHeader className="pb-2 pt-0"><CardTitle className="text-sm">Custo Mensal</CardTitle></CardHeader>
              <CardContent className="h-48">
                {mensal.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem série mensal</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mensal.map((m) => ({ ...m, competencia: formatCompetencia(m.competencia) }))}>
                      <XAxis dataKey="competencia" fontSize={10} />
                      <YAxis hide />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="custo_mensal" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Proventos + Vantagens</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow><TableHead className="w-12">#</TableHead><TableHead>Evento</TableHead><TableHead className="text-right">Proventos (R$)</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-6" /></TableCell></TableRow>}
                      {!isLoading && proventos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>}
                      {proventos.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{p.codigo ?? "-"}</TableCell>
                          <TableCell>{p.descricao}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(p.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow><TableCell colSpan={2}>Total</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(totalProvento)}</TableCell></TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Descontos</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow><TableHead className="w-12">#</TableHead><TableHead>Evento</TableHead><TableHead className="text-right">Desc. (R$)</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-6" /></TableCell></TableRow>}
                      {!isLoading && descontos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>}
                      {descontos.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{p.codigo ?? "-"}</TableCell>
                          <TableCell className="text-xs">{p.descricao}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(p.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow><TableCell colSpan={2}>Total</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(totalDesconto)}</TableCell></TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filial + Tipos de Evento */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Filial</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>Filial</TableHead>
                        <TableHead className="text-right">Salário Base</TableHead>
                        <TableHead className="text-right">Custo Total</TableHead>
                        <TableHead className="text-right">Qtd. Horas</TableHead>
                        <TableHead className="text-right">Custo H. Extra</TableHead>
                        <TableHead className="text-right">Qtd. H. Extra</TableHead>
                        <TableHead className="text-right">Líquido</TableHead>
                        <TableHead className="text-right">FGTS</TableHead>
                        <TableHead className="text-right">V.A.</TableHead>
                        <TableHead className="text-right">INSS</TableHead>
                        <TableHead className="text-right">Custo Férias</TableHead>
                        <TableHead className="text-right">Provisões</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && <TableRow><TableCell colSpan={12}><Skeleton className="h-6" /></TableCell></TableRow>}
                      {!isLoading && filiaisData.length === 0 && (
                        <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>
                      )}
                      {filiaisData.map((f, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{f.filial}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(f.salario_base ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(f.custo_total ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatHorasMin(f.qtd_horas ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(f.custo_hora_extra ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatHorasMin(f.qtd_hora_extra ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(f.liquido ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(f.fgts ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(f.beneficios ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(f.inss ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(f.custo_ferias ?? 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(f.provisoes ?? 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Tipos de Evento</CardTitle></CardHeader>
              <CardContent className="h-[420px]">
                {tiposPie.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tiposPie}
                        dataKey="valor"
                        nameKey="tipo"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {tiposPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, _n: any, p: any) =>
                          `${formatCurrency(v)} (${((p?.payload?.pct ?? 0) * 100).toFixed(1)}%)`
                        }
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconSize={8}
                        formatter={(value, entry: any) => {
                          const pct = (entry?.payload?.pct ?? 0) * 100;
                          return `${value} — ${pct.toFixed(0)}%`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
