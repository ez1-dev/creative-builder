import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
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
  fetchResumoFolhaDashboard,
  DashboardIndisponivelError,
  toAnomes,
} from "@/lib/rh/api";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatHorasMin } from "@/lib/rh/eventoBuckets";

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

/** Renderiza valor numérico OU badge "Campo não retornado pela API: x" */
function ValueOrMissing({
  value,
  missing,
  field,
  format = "currency",
}: {
  value: number | undefined;
  missing: boolean;
  field: string;
  format?: "currency" | "number" | "horas";
}) {
  if (missing) {
    return (
      <span
        className="text-[11px] text-warning font-medium"
        title={`O backend não retornou ${field}`}
      >
        Campo não retornado pela API: {field}
      </span>
    );
  }
  const v = value ?? 0;
  if (format === "horas") return <>{formatHorasMin(v)}</>;
  if (format === "number") return <>{formatNumber(v)}</>;
  return <>{formatCurrency(v)}</>;
}

/** KpiCard que mostra aviso técnico quando o campo está ausente */
function KpiOrMissing({
  title,
  value,
  missing,
  field,
  variant,
  loading,
}: {
  title: string;
  value: number | undefined;
  missing: boolean;
  field: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}) {
  if (missing) {
    return (
      <Card className="border-warning/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[11px] text-warning font-medium">
            Campo não retornado pela API: {field}
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <KpiCard
      title={title}
      value={value ?? 0}
      format="currency"
      variant={variant}
      loading={loading}
    />
  );
}

export default function ResumoFolhaPage() {
  const [ini, setIni] = useState(defaultMonth(-5));
  const [fim, setFim] = useState(defaultMonth(0));
  const [filial, setFilial] = useState<string>("__all__");
  const [busca, setBusca] = useState("");

  const params = {
    anomes_ini: toAnomes(ini),
    anomes_fim: toAnomes(fim),
    codemp: 1,
    filial: filial !== "__all__" ? filial : undefined,
    matricula: busca || undefined,
  };

  const enabled = !!params.anomes_ini && !!params.anomes_fim;

  const query = useQuery({
    queryKey: ["rh", "resumo-folha-dashboard", params],
    queryFn: () => fetchResumoFolhaDashboard(params),
    enabled,
    retry: (count, err) =>
      err instanceof DashboardIndisponivelError ? false : count < 1,
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

  const filiaisOpts = useMemo<string[]>(
    () => Array.from(new Set(filiaisData.map((f) => f.filial).filter(Boolean) as string[])),
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

  const FILIAL_COLS: { key: keyof typeof filiaisData[number]; label: string; format: "currency" | "number" | "horas" }[] = [
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
            O backend precisa expor <code>GET /api/rh/resumo-folha/dashboard?anomes_ini=YYYYMM&amp;anomes_fim=YYYYMM&amp;codemp=1</code>.
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
                  <div className="text-xl font-bold tabular-nums">
                    <ValueOrMissing value={kpis?.provento} missing={isMissing("provento")} field="provento" />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Desconto</div>
                  <div className="text-xl font-bold tabular-nums text-destructive">
                    <ValueOrMissing value={kpis?.desconto} missing={isMissing("desconto")} field="desconto" />
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-[11px] text-muted-foreground">Total Líquido</div>
                  <div className="text-2xl font-bold tabular-nums text-primary">
                    <ValueOrMissing value={kpis?.total_liquido} missing={isMissing("total_liquido")} field="total_liquido" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <KpiOrMissing title="Custo Total" value={kpis?.custo_total} missing={isMissing("custo_total")} field="custo_total" variant="danger" loading={isLoading} />
            <KpiOrMissing title="Benefícios" value={kpis?.beneficios} missing={isMissing("beneficios")} field="beneficios" loading={isLoading} />
            <KpiOrMissing title="INSS Total" value={kpis?.inss_total} missing={isMissing("inss_total")} field="inss_total" loading={isLoading} />
            <KpiOrMissing title="Hora Extra" value={kpis?.hora_extra} missing={isMissing("hora_extra")} field="hora_extra" variant="warning" loading={isLoading} />

            <KpiOrMissing title="Provisões" value={kpis?.provisoes} missing={isMissing("provisoes")} field="provisoes" loading={isLoading} />
            <KpiOrMissing title="Custo das Férias" value={kpis?.custo_ferias} missing={isMissing("custo_ferias")} field="custo_ferias" loading={isLoading} />
            <KpiOrMissing title="Rescisões" value={kpis?.rescisoes} missing={isMissing("rescisoes")} field="rescisoes" variant="warning" loading={isLoading} />
            <KpiOrMissing title="FGTS" value={kpis?.fgts} missing={isMissing("fgts")} field="fgts" loading={isLoading} />
          </div>

          {/* Proventos / Descontos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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

            <Card>
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
                        {FILIAL_COLS.map((c) => (
                          <TableHead key={c.key as string} className="text-right">{c.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && <TableRow><TableCell colSpan={FILIAL_COLS.length + 1}><Skeleton className="h-6" /></TableCell></TableRow>}
                      {!isLoading && filiaisData.length === 0 && (
                        <TableRow><TableCell colSpan={FILIAL_COLS.length + 1} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>
                      )}
                      {filiaisData.map((f, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{f.filial}</TableCell>
                          {FILIAL_COLS.map((c) => {
                            const present = (c.key as string) in (f as any);
                            const v = (f as any)[c.key] as number | undefined;
                            return (
                              <TableCell key={c.key as string} className="text-right tabular-nums">
                                <ValueOrMissing
                                  value={v}
                                  missing={!present}
                                  field={c.key as string}
                                  format={c.format}
                                />
                              </TableCell>
                            );
                          })}
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
