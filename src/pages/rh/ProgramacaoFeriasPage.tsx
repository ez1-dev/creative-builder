import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader, statusFeriasBadgeCls } from "@/components/rh/RhPageHeader";
import { fetchProgramacaoFerias } from "@/lib/rh/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ProgramacaoFeriasPage() {
  const [status, setStatus] = useState("__all__");
  const [filial, setFilial] = useState("__all__");
  const [cc, setCc] = useState("__all__");
  const [busca, setBusca] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["rh", "programacao-ferias"],
    queryFn: () => fetchProgramacaoFerias(),
  });

  const statuses = useMemo(() => Array.from(new Set(data.map((d) => d.status_ferias).filter(Boolean))) as string[], [data]);
  const filiais = useMemo(() => Array.from(new Set(data.map((d) => d.filial).filter(Boolean))) as string[], [data]);
  const ccs = useMemo(() => Array.from(new Set(data.map((d) => d.centro_custo).filter(Boolean))) as string[], [data]);

  const rows = useMemo(() => data.filter((r) => {
    if (status !== "__all__" && r.status_ferias !== status) return false;
    if (filial !== "__all__" && r.filial !== filial) return false;
    if (cc !== "__all__" && r.centro_custo !== cc) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!(r.matricula || "").toString().toLowerCase().includes(q) &&
          !(r.colaborador || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [data, status, filial, cc, busca]);

  const kpis = useMemo(() => {
    const norm = (s?: string) => (s || "").toUpperCase();
    return {
      total: rows.length,
      sem: rows.filter((r) => norm(r.status_ferias).includes("SEM PROGRAMACAO")).length,
      venc: rows.filter((r) => norm(r.status_ferias).includes("LIMITE VENCIDO")).length,
      d30: rows.filter((r) => norm(r.status_ferias).includes("LIMITE ATE 30")).length,
      saldo: rows.reduce((a, r) => a + (Number(r.dias_saldo) || 0), 0),
    };
  }, [rows]);

  return (
    <div className="container mx-auto py-6">
      <RhPageHeader title="04 — Programação de Férias" />

      <Card className="mb-4">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <div>
            <Label>C. Custo</Label>
            <Select value={cc} onValueChange={setCc}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {ccs.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Colaborador / Matrícula</Label><Input value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KpiCard title="Registros" value={kpis.total} format="integer" loading={isLoading} />
        <KpiCard title="Sem Programação" value={kpis.sem} format="integer" variant="warning" loading={isLoading} />
        <KpiCard title="Limite Vencido" value={kpis.venc} format="integer" variant="danger" loading={isLoading} />
        <KpiCard title="Limite ≤ 30 dias" value={kpis.d30} format="integer" variant="warning" loading={isLoading} />
        <KpiCard title="Total Dias Saldo" value={kpis.saldo} format="integer" loading={isLoading} />
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
                  <TableHead>Sit. Colab.</TableHead>
                  <TableHead>Sit. Férias</TableHead>
                  <TableHead>Início Período</TableHead>
                  <TableHead>Fim Período</TableHead>
                  <TableHead>Limite Saída</TableHead>
                  <TableHead className="text-right">D. Direito</TableHead>
                  <TableHead className="text-right">D. Saldo</TableHead>
                  <TableHead>Dt. Program.</TableHead>
                  <TableHead className="text-right">D. Program.</TableHead>
                  <TableHead className="text-right">D. Abono</TableHead>
                  <TableHead>Fim Program.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={17}><Skeleton className="h-6" /></TableCell></TableRow>
                ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={17} className="text-center text-muted-foreground py-6">Nenhum registro</TableCell></TableRow>
                )}
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.matricula}</TableCell>
                    <TableCell>{r.colaborador}</TableCell>
                    <TableCell>{r.filial}</TableCell>
                    <TableCell>{r.centro_custo}</TableCell>
                    <TableCell>{r.cargo}</TableCell>
                    <TableCell>{r.situacao_colaborador}</TableCell>
                    <TableCell>{r.situacao_ferias}</TableCell>
                    <TableCell>{formatDate(r.inicio_periodo)}</TableCell>
                    <TableCell>{formatDate(r.fim_periodo)}</TableCell>
                    <TableCell>{formatDate(r.limite_saida)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.dias_direito ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.dias_saldo ?? "-"}</TableCell>
                    <TableCell>{formatDate(r.data_programacao)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.dias_programados ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.dias_abono ?? "-"}</TableCell>
                    <TableCell>{formatDate(r.fim_programacao)}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", statusFeriasBadgeCls(r.status_ferias))}>
                        {r.status_ferias || "-"}
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
