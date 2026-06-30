import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader, statusContratoBadgeCls } from "@/components/rh/RhPageHeader";
import { fetchContratoExperiencia } from "@/lib/rh/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ContratoExperienciaPage() {
  const [status, setStatus] = useState("__all__");
  const [filial, setFilial] = useState("__all__");
  const [busca, setBusca] = useState("");

  const serverParams = {
    status: status !== "__all__" ? status : undefined,
    filial: filial !== "__all__" ? filial : undefined,
    colaborador: busca || undefined,
  };
  const { data = [], isLoading } = useQuery({
    queryKey: ["rh", "contrato-experiencia", serverParams],
    queryFn: () => fetchContratoExperiencia(serverParams),
  });

  const statuses = useMemo(() => Array.from(new Set(data.map((d) => d.status_contrato).filter(Boolean))) as string[], [data]);
  const filiais = useMemo(() => Array.from(new Set(data.map((d) => d.filial).filter(Boolean))) as string[], [data]);

  const rows = useMemo(() => data.filter((r) => {
    if (status !== "__all__" && r.status_contrato !== status) return false;
    if (filial !== "__all__" && r.filial !== filial) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!(r.matricula || "").toString().toLowerCase().includes(q) &&
          !(r.colaborador || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [data, status, filial, busca]);

  const kpis = useMemo(() => {
    const norm = (s?: string) => (s || "").toUpperCase();
    return {
      total: rows.length,
      vencidos: rows.filter((r) => norm(r.status_contrato).includes("VENCIDO")).length,
      d10: rows.filter((r) => norm(r.status_contrato).includes("10 DIAS")).length,
      d30: rows.filter((r) => norm(r.status_contrato).includes("30 DIAS")).length,
      ok: rows.filter((r) => norm(r.status_contrato).includes("NO PRAZO")).length,
    };
  }, [rows]);

  return (
    <div className="container mx-auto py-6">
      <RhPageHeader title="03 — Contrato Experiência" />

      <Card className="mb-4">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
          <div><Label>Colaborador / Matrícula</Label><Input value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KpiCard title="Total Contratos" value={kpis.total} format="number" loading={isLoading} />
        <KpiCard title="Vencidos" value={kpis.vencidos} format="number" variant="danger" loading={isLoading} />
        <KpiCard title="Vence ≤ 10 dias" value={kpis.d10} format="number" variant="danger" loading={isLoading} />
        <KpiCard title="Vence ≤ 30 dias" value={kpis.d30} format="number" variant="warning" loading={isLoading} />
        <KpiCard title="No Prazo" value={kpis.ok} format="number" variant="success" loading={isLoading} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>C. Custo</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead className="text-right">Dias contrato</TableHead>
                  <TableHead className="text-right">Dias prorrog.</TableHead>
                  <TableHead>Fim 1</TableHead>
                  <TableHead>Fim final</TableHead>
                  <TableHead className="text-right">Dias restantes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={12}><Skeleton className="h-6" /></TableCell></TableRow>
                ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">Nenhum contrato</TableCell></TableRow>
                )}
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.matricula}</TableCell>
                    <TableCell>{r.colaborador}</TableCell>
                    <TableCell>{r.filial}</TableCell>
                    <TableCell>{r.centro_custo}</TableCell>
                    <TableCell>{r.cargo}</TableCell>
                    <TableCell>{formatDate(r.data_admissao)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.dias_contrato ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.dias_prorrogacao ?? "-"}</TableCell>
                    <TableCell>{formatDate(r.fim_contrato_1)}</TableCell>
                    <TableCell>{formatDate(r.fim_contrato_final)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.dias_restantes ?? "-"}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", statusContratoBadgeCls(r.status_contrato))}>
                        {r.status_contrato || "-"}
                      </span>
                    </TableCell>
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
