import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { ChevronDown, Info } from "lucide-react";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  fetchResumoFolhaDashboard,
  DashboardIndisponivelError,
  toAnomes,
  type ResumoFolhaModo,
} from "@/lib/rh/api";
import { formatCurrency } from "@/lib/format";


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

function fmtHoras(v: string | number | undefined): string {
  if (v == null || v === "") return "-";
  return String(v);
}

function fmtCompetencia(v: string): string {
  const s = String(v ?? "").replace(/\D/g, "");
  if (s.length === 6) return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
  return v;
}

/** Renderiza valor numérico OU badge "Campo não retornado pela API: x" */
function ValueOrMissing({
  value,
  missing,
  field,
  format = "currency",
}: {
  value: number | string | undefined;
  missing: boolean;
  field: string;
  format?: "currency" | "horas";
}) {
  if (missing) {
    return (
      <span className="text-[11px] text-warning font-medium" title={`O backend não retornou ${field}`}>
        Campo não retornado pela API: {field}
      </span>
    );
  }
  if (format === "horas") return <>{fmtHoras(value as any)}</>;
  return <>{formatCurrency(Number(value ?? 0))}</>;
}

function KpiOrMissing({
  title, value, missing, field, variant, loading,
}: {
  title: string; value: number | undefined; missing: boolean; field: string;
  variant?: "danger" | "warning"; loading?: boolean;
}) {
  if (missing) {
    return (
      <Card className="border-warning/40">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
        <CardContent><div className="text-[11px] text-warning font-medium">Campo não retornado pela API: {field}</div></CardContent>
      </Card>
    );
  }
  return <KpiCard title={title} value={value ?? 0} format="currency" variant={variant} loading={loading} />;
}

export default function ResumoFolhaPage() {
  const [ini, setIni] = useState(defaultMonth(-5));
  const [fim, setFim] = useState(defaultMonth(0));
  const [codemp, setCodemp] = useState("1");
  const [modo, setModo] = useState<ResumoFolhaModo>("acumulado");

  const baseParams = {
    anomes_ini: toAnomes(ini),
    anomes_fim: toAnomes(fim),
    codemp: Number(codemp) || 1,
  };
  const enabled = !!baseParams.anomes_ini && !!baseParams.anomes_fim;

  const query = useQuery({
    queryKey: ["rh", "resumo-folha-dashboard", baseParams, modo],
    queryFn: () => fetchResumoFolhaDashboard(baseParams, modo),
    enabled,
    retry: (count, err) => (err instanceof DashboardIndisponivelError ? false : count < 1),
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
  const mensal = data?.mensal ?? [];
  const diagnostico = data?.diagnostico ?? data?.debug;
  const { isAdmin } = useUserPermissions();

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

  return (
    <div className="container mx-auto py-6 space-y-4">
      <RhPageHeader title="01 — Resumo Folha" subtitle="Painel consolidado da folha de pagamento" />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div><Label>Ano/mês inicial</Label><Input type="month" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
          <div><Label>Ano/mês final</Label><Input type="month" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          <div><Label>Empresa (codemp)</Label><Input value={codemp} onChange={(e) => setCodemp(e.target.value)} placeholder="1" /></div>
          <div>
            <Label>Modo</Label>
            <Tabs value={modo} onValueChange={(v) => setModo(v as ResumoFolhaModo)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="acumulado">Acumulado</TabsTrigger>
                <TabsTrigger value="mensal">Mensal</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
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

      {!indisponivel && modo === "mensal" && (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução mensal</CardTitle></CardHeader>
            <CardContent className="h-[360px]">
              {mensal.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  {isLoading ? "Carregando..." : "Sem dados no período"}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mensal.map((m) => ({ ...m, label: fmtCompetencia(m.competencia) }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={11} tickFormatter={(v) => `R$ ${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="provento" name="Provento" fill="hsl(var(--primary))" />
                    <Bar dataKey="desconto" name="Desconto" fill="hsl(var(--destructive))" />
                    <Bar dataKey="total_liquido" name="Líquido" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Detalhamento mensal</CardTitle></CardHeader>
            <CardContent>
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
                  {mensal.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{fmtCompetencia(m.competencia)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(m.provento ?? 0)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">{formatCurrency(m.desconto ?? 0)}</TableCell>
                      <TableCell className="text-right tabular-nums text-primary font-semibold">{formatCurrency(m.total_liquido ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

            </CardContent>
          </Card>
        </>
      )}

      {!indisponivel && modo === "acumulado" && (
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

          {/* Aviso técnico */}
          <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/5 px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Indicadores de Custo Total, INSS, FGTS, Provisões, Hora Extra e Custo Férias são calculados pela API com base nas fontes oficiais do Vetorh.
            </span>
          </div>

          {/* Diagnóstico Técnico (admin) */}
          {isAdmin && diagnostico && (
            <Collapsible>
              <Card>
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">Diagnóstico Técnico</CardTitle>
                      <ChevronDown className="h-4 w-4" />
                    </CardHeader>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    {[
                      ["custo_total_componentes", "Custo Total — componentes"],
                      ["inss_componentes", "INSS — componentes"],
                      ["hora_extra_componentes", "Hora Extra — componentes"],
                      ["ferias_componentes", "Férias — componentes"],
                      ["fgts_componentes", "FGTS — componentes"],
                      ["provisoes_componentes", "Provisões — componentes"],
                    ].map(([key, label]) => {
                      const v = (diagnostico as any)?.[key];
                      if (v == null) return null;
                      return (
                        <div key={key}>
                          <div className="text-xs font-semibold mb-1">{label}</div>
                          <pre className="text-[11px] bg-muted p-2 rounded overflow-auto max-h-64">
                            {typeof v === "string" ? v : JSON.stringify(v, null, 2)}
                          </pre>
                        </div>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}


          {/* Proventos / Descontos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Proventos + Vantagens</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow><TableHead className="w-16">Cód.</TableHead><TableHead>Evento</TableHead><TableHead className="text-right">Proventos (R$)</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-6" /></TableCell></TableRow>}
                      {!isLoading && proventos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>}
                      {proventos.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{p.cd_evento ?? "-"}</TableCell>
                          <TableCell>{p.ds_evento ?? "-"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(p.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>


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
                      <TableRow><TableHead className="w-16">Cód.</TableHead><TableHead>Evento</TableHead><TableHead className="text-right">Desc. (R$)</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-6" /></TableCell></TableRow>}
                      {!isLoading && descontos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>}
                      {descontos.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{p.cd_evento ?? "-"}</TableCell>
                          <TableCell className="text-xs">{p.ds_evento ?? "-"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(p.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>


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
                            return (
                              <TableCell key={c.key} className="text-right tabular-nums">
                                <ValueOrMissing value={v} missing={!present} field={c.key} format={c.format} />
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
                      <Pie data={tiposPie} dataKey="valor" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {tiposPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, _n: any, p: any) => `${formatCurrency(v)} (${((p?.payload?.pct ?? 0) * 100).toFixed(1)}%)`} />
                      <Legend verticalAlign="bottom" iconSize={8} formatter={(value, entry: any) => {
                        const pct = (entry?.payload?.pct ?? 0) * 100;
                        return `${value} — ${pct.toFixed(0)}%`;
                      }} />
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
