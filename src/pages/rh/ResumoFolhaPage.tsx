import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { fetchResumoFolha } from "@/lib/rh/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

function defaultMonth(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const toAnomes = (v: string) => (v ? v.replace("-", "") : "");

export default function ResumoFolhaPage() {
  const [ini, setIni] = useState(defaultMonth(-5));
  const [fim, setFim] = useState(defaultMonth(0));
  const [filial, setFilial] = useState<string>("__all__");
  const [busca, setBusca] = useState("");

  const params = { anomes_ini: toAnomes(ini), anomes_fim: toAnomes(fim) };
  const { data = [], isLoading } = useQuery({
    queryKey: ["rh", "resumo-folha", params],
    queryFn: () => fetchResumoFolha(params),
    enabled: !!params.anomes_ini && !!params.anomes_fim,
  });

  const filiais = useMemo(() => Array.from(new Set(data.map((d) => d.filial).filter(Boolean))) as string[], [data]);

  const rows = useMemo(() => {
    return data.filter((r) => {
      if (filial !== "__all__" && r.filial !== filial) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const m = (r.matricula || "").toString().toLowerCase();
        const c = (r.colaborador || "").toLowerCase();
        if (!m.includes(q) && !c.includes(q)) return false;
      }
      return true;
    });
  }, [data, filial, busca]);

  const kpis = useMemo(() => {
    const proventos = rows.reduce((a, r) => a + (Number(r.provento) || 0), 0);
    const descontos = rows.reduce((a, r) => a + (Number(r.desconto) || 0), 0);
    const liquido = rows.reduce((a, r) => a + (Number(r.liquido_calculado) || 0), 0);
    const colabs = new Set(rows.map((r) => r.matricula).filter(Boolean)).size;
    return { proventos, descontos, liquido, colabs, qtd: rows.length };
  }, [rows]);

  return (
    <div className="container mx-auto py-6">
      <RhPageHeader title="01 — Resumo Folha" subtitle="Eventos da folha por competência" />
      <Card className="mb-4">
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KpiCard title="Total Proventos" value={kpis.proventos} format="currency" variant="success" loading={isLoading} />
        <KpiCard title="Total Descontos" value={kpis.descontos} format="currency" variant="danger" loading={isLoading} />
        <KpiCard title="Líquido Calculado" value={kpis.liquido} format="currency" variant="info" loading={isLoading} />
        <KpiCard title="Colaboradores" value={kpis.colabs} format="number" loading={isLoading} />
        <KpiCard title="Registros" value={kpis.qtd} format="number" loading={isLoading} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>C. Custo</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Referência</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Provento</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead>Dt. Pagto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={14}><Skeleton className="h-6" /></TableCell></TableRow>
                ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-6">Nenhum registro</TableCell></TableRow>
                )}
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.competencia}</TableCell>
                    <TableCell>{r.matricula}</TableCell>
                    <TableCell>{r.colaborador}</TableCell>
                    <TableCell>{r.filial}</TableCell>
                    <TableCell>{r.centro_custo}</TableCell>
                    <TableCell>{r.evento}</TableCell>
                    <TableCell>{r.descricao_evento}</TableCell>
                    <TableCell>{r.tipo_evento}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.referencia != null ? formatNumber(Number(r.referencia)) : "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(r.valor_evento)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(r.provento)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(r.desconto)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(r.liquido_calculado)}</TableCell>
                    <TableCell>{formatDate(r.data_pagamento)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
