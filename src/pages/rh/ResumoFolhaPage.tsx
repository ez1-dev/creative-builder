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
import { fetchResumoFolha } from "@/lib/rh/api";
import type { ResumoFolhaItem } from "@/lib/rh/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  classifyEvento, somarBucket, groupBy, formatHorasMin, formatCompetencia, valorLinha,
} from "@/lib/rh/eventoBuckets";

function defaultMonth(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const toAnomes = (v: string) => (v ? v.replace("-", "") : "");

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
  const { data = [], isLoading } = useQuery({
    queryKey: ["rh", "resumo-folha", params],
    queryFn: () => fetchResumoFolha(params),
    enabled: !!params.anomes_ini && !!params.anomes_fim,
  });

  const filiais = useMemo(
    () => Array.from(new Set(data.map((d) => d.filial).filter(Boolean))) as string[],
    [data],
  );

  // Filtragem local extra
  const rows = useMemo(() => data.filter((r) => {
    if (filial !== "__all__" && r.filial !== filial) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!(r.matricula || "").toString().toLowerCase().includes(q) &&
          !(r.colaborador || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [data, filial, busca]);

  // -------- KPIs ----------
  const kpis = useMemo(() => {
    const provento = rows.reduce((a, r) => a + (Number(r.provento) || 0), 0);
    const desconto = rows.reduce((a, r) => a + (Number(r.desconto) || 0), 0);
    const liquido = provento - desconto;
    const horaExtra = somarBucket(rows, "HORA_EXTRA");
    const ferias = somarBucket(rows, "FERIAS");
    const rescisao = somarBucket(rows, "RESCISAO");
    const inss = somarBucket(rows, "INSS");
    const fgts = somarBucket(rows, "FGTS");
    const benef = somarBucket(rows, "BENEFICIOS");
    const provis = somarBucket(rows, "PROVISOES");
    const custoTotal = provento + inss + fgts + provis;
    return { provento, desconto, liquido, horaExtra, ferias, rescisao, inss, fgts, benef, provis, custoTotal };
  }, [rows]);

  // -------- Gráficos mensais ----------
  const dadosMensais = useMemo(() => {
    const porMes = groupBy(rows, (r) => r.competencia as string | undefined);
    const labels = Object.keys(porMes).sort();
    return labels.map((c) => ({
      competencia: formatCompetencia(c),
      custoHoraExtra: somarBucket(porMes[c], "HORA_EXTRA"),
      custoMensal: porMes[c].reduce((a, r) => a + (Number(r.provento) || 0), 0),
    }));
  }, [rows]);

  // -------- Top eventos ----------
  const { topProventos, topDescontos, totalProvento, totalDesconto } = useMemo(() => {
    type Agg = { codigo: string; descricao: string; provento: number; desconto: number };
    const map = new Map<string, Agg>();
    for (const r of rows) {
      const key = `${r.evento ?? "-"}|${r.descricao_evento ?? "-"}`;
      const cur = map.get(key) ?? {
        codigo: String(r.evento ?? "-"),
        descricao: r.descricao_evento ?? "-",
        provento: 0,
        desconto: 0,
      };
      cur.provento += Number(r.provento) || 0;
      cur.desconto += Number(r.desconto) || 0;
      map.set(key, cur);
    }
    const all = Array.from(map.values());
    const topP = all.filter((x) => x.provento > 0).sort((a, b) => b.provento - a.provento).slice(0, 50);
    const topD = all.filter((x) => x.desconto > 0).sort((a, b) => b.desconto - a.desconto).slice(0, 50);
    return {
      topProventos: topP,
      topDescontos: topD,
      totalProvento: topP.reduce((a, x) => a + x.provento, 0),
      totalDesconto: topD.reduce((a, x) => a + x.desconto, 0),
    };
  }, [rows]);

  // -------- Tabela por filial ----------
  const linhasFilial = useMemo(() => {
    const grupos = groupBy(rows, (r) => r.filial as string | undefined);
    return Object.entries(grupos).map(([nome, rs]) => {
      const isHN = (r: ResumoFolhaItem) => classifyEvento(r).includes("HORAS_NORMAIS");
      const isHE = (r: ResumoFolhaItem) => classifyEvento(r).includes("HORA_EXTRA");
      const provento = rs.reduce((a, r) => a + (Number(r.provento) || 0), 0);
      const desconto = rs.reduce((a, r) => a + (Number(r.desconto) || 0), 0);
      const salarioBase = rs.filter(isHN).reduce((a, r) => a + (Number(r.provento) || 0), 0);
      const qtdHoras = rs.filter(isHN).reduce((a, r) => a + (Number(r.referencia) || 0), 0);
      const qtdHE = rs.filter(isHE).reduce((a, r) => a + (Number(r.referencia) || 0), 0);
      const inss = somarBucket(rs, "INSS");
      const fgts = somarBucket(rs, "FGTS");
      const ferias = somarBucket(rs, "FERIAS");
      const provis = somarBucket(rs, "PROVISOES");
      const benef = somarBucket(rs, "BENEFICIOS");
      const custoHE = somarBucket(rs, "HORA_EXTRA");
      const custoTotal = provento + inss + fgts + provis;
      const liquido = provento - desconto;
      return { nome, salarioBase, custoTotal, qtdHoras, custoHE, qtdHE, liquido, fgts, benef, inss, ferias, provis };
    }).sort((a, b) => b.custoTotal - a.custoTotal);
  }, [rows]);

  // -------- Donut Tipos de Evento ----------
  const tiposEvento = useMemo(() => {
    const grupos = groupBy(rows, (r) => (r.tipo_evento || "OUTROS") as string);
    let entries = Object.entries(grupos).map(([tipo, rs]) => ({
      tipo,
      valor: rs.reduce((a, r) => a + valorLinha(r), 0),
    }));
    const total = entries.reduce((a, e) => a + e.valor, 0) || 1;
    // agrupa < 2% em OUTROS
    const grandes: typeof entries = [];
    let outros = 0;
    for (const e of entries) {
      if (e.valor / total < 0.02) outros += e.valor;
      else grandes.push(e);
    }
    if (outros > 0) grandes.push({ tipo: "OUTROS", valor: outros });
    return grandes.sort((a, b) => b.valor - a.valor).map((e) => ({
      ...e,
      pct: e.valor / total,
    }));
  }, [rows]);

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
                {filiais.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Matrícula / Colaborador</Label><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Busca..." /></div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Líquido — card duplo */}
        <Card className="md:row-span-2 border-l-4 border-l-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Líquido</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-[11px] text-muted-foreground">Provento</div>
              <div className="text-xl font-bold tabular-nums">{formatCurrency(kpis.provento)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Desconto</div>
              <div className="text-xl font-bold tabular-nums text-destructive">{formatCurrency(kpis.desconto)}</div>
            </div>
            <div className="pt-2 border-t">
              <div className="text-[11px] text-muted-foreground">Total Líquido</div>
              <div className="text-2xl font-bold tabular-nums text-primary">{formatCurrency(kpis.liquido)}</div>
            </div>
          </CardContent>
        </Card>

        <KpiCard title="Custo Total" value={kpis.custoTotal} format="currency" variant="danger" loading={isLoading} />
        <KpiCard title="Benefícios" value={kpis.benef} format="currency" loading={isLoading} />
        <KpiCard title="INSS Total" value={kpis.inss} format="currency" loading={isLoading} />
        <KpiCard title="Hora Extra" value={kpis.horaExtra} format="currency" variant="warning" loading={isLoading} />

        <KpiCard title="Provisões" value={kpis.provis} format="currency" loading={isLoading} />
        <KpiCard title="Custo das Férias" value={kpis.ferias} format="currency" loading={isLoading} />
        <KpiCard title="Rescisões" value={kpis.rescisao} format="currency" variant="warning" loading={isLoading} />
        <KpiCard title="FGTS" value={kpis.fgts} format="currency" loading={isLoading} />
      </div>

      {/* Gráficos + Top eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Custo Hora Extra</CardTitle></CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosMensais}>
                <XAxis dataKey="competencia" fontSize={10} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="custoHoraExtra" fill="hsl(var(--muted-foreground))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <CardHeader className="pb-2 pt-0"><CardTitle className="text-sm">Custo Mensal</CardTitle></CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosMensais}>
                <XAxis dataKey="competencia" fontSize={10} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="custoMensal" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
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
                  {!isLoading && topProventos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>}
                  {topProventos.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{p.codigo}</TableCell>
                      <TableCell>{p.descricao}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(p.provento)}</TableCell>
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
                  {!isLoading && topDescontos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>}
                  {topDescontos.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{p.codigo}</TableCell>
                      <TableCell className="text-xs">{p.descricao}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(p.desconto)}</TableCell>
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
                  {!isLoading && linhasFilial.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>
                  )}
                  {linhasFilial.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.salarioBase)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.custoTotal)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHorasMin(f.qtdHoras)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.custoHE)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHorasMin(f.qtdHE)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.liquido)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.fgts)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.benef)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.inss)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.ferias)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(f.provis)}</TableCell>
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
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tiposEvento}
                  dataKey="valor"
                  nameKey="tipo"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {tiposEvento.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number, _n: any, p: any) =>
                    `${formatCurrency(v)} (${(p?.payload?.pct * 100).toFixed(1)}%)`
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
