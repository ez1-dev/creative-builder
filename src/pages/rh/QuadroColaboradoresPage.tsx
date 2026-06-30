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
import { fetchQuadroColaboradores } from "@/lib/rh/api";
import { formatDate } from "@/lib/format";

export default function QuadroColaboradoresPage() {
  const [filial, setFilial] = useState("__all__");
  const [situacao, setSituacao] = useState("__all__");
  const [cc, setCc] = useState("__all__");
  const [cargo, setCargo] = useState("__all__");
  const [busca, setBusca] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["rh", "quadro"],
    queryFn: () => fetchQuadroColaboradores(),
  });

  const uniq = (k: keyof typeof data[number]) =>
    Array.from(new Set(data.map((d) => d[k]).filter(Boolean))) as string[];
  const filiais = useMemo(() => uniq("filial" as any), [data]);
  const situacoes = useMemo(() => uniq("situacao" as any), [data]);
  const ccs = useMemo(() => uniq("centro_custo" as any), [data]);
  const cargos = useMemo(() => uniq("cargo" as any), [data]);

  const rows = useMemo(() => {
    return data.filter((r) => {
      if (filial !== "__all__" && r.filial !== filial) return false;
      if (situacao !== "__all__" && r.situacao !== situacao) return false;
      if (cc !== "__all__" && r.centro_custo !== cc) return false;
      if (cargo !== "__all__" && r.cargo !== cargo) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!(r.matricula || "").toString().toLowerCase().includes(q) &&
            !(r.colaborador || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, filial, situacao, cc, cargo, busca]);

  const kpis = useMemo(() => {
    const norm = (s?: string) => (s || "").toUpperCase();
    const total = rows.length;
    const ativos = rows.filter((r) => norm(r.situacao).includes("ATIVO")).length;
    const demit = rows.filter((r) => norm(r.situacao).includes("DEMI")).length;
    const afast = rows.filter((r) => norm(r.situacao).includes("AFAST") || norm(r.situacao).includes("FERIAS") || norm(r.situacao).includes("FÉRIAS")).length;
    return { total, ativos, demit, afast };
  }, [rows]);

  return (
    <div className="container mx-auto py-6">
      <RhPageHeader title="02 — Quadro de Colaboradores" />

      <Card className="mb-4">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-5 gap-3">
          <SelectFilter label="Filial" value={filial} onChange={setFilial} options={filiais} />
          <SelectFilter label="Situação" value={situacao} onChange={setSituacao} options={situacoes} />
          <SelectFilter label="C. Custo" value={cc} onChange={setCc} options={ccs} />
          <SelectFilter label="Cargo" value={cargo} onChange={setCargo} options={cargos} />
          <div><Label>Nome / Matrícula</Label><Input value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard title="Total Colaboradores" value={kpis.total} format="number" loading={isLoading} />
        <KpiCard title="Ativos" value={kpis.ativos} format="number" variant="success" loading={isLoading} />
        <KpiCard title="Demitidos" value={kpis.demit} format="number" variant="danger" loading={isLoading} />
        <KpiCard title="Afastados / Férias" value={kpis.afast} format="number" variant="warning" loading={isLoading} />
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
                  <TableHead>Local</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Demissão</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Cat. eSocial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={14}><Skeleton className="h-6" /></TableCell></TableRow>
                ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-6">Nenhum colaborador</TableCell></TableRow>
                )}
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.matricula}</TableCell>
                    <TableCell>{r.colaborador}</TableCell>
                    <TableCell>{r.filial}</TableCell>
                    <TableCell>{r.centro_custo}</TableCell>
                    <TableCell>{r.cargo}</TableCell>
                    <TableCell>{r.local}</TableCell>
                    <TableCell>{r.vinculo}</TableCell>
                    <TableCell>{r.sexo}</TableCell>
                    <TableCell>{formatDate(r.data_nascimento)}</TableCell>
                    <TableCell>{formatDate(r.data_admissao)}</TableCell>
                    <TableCell>{r.situacao}</TableCell>
                    <TableCell>{formatDate(r.data_demissao)}</TableCell>
                    <TableCell>{r.cpf}</TableCell>
                    <TableCell>{r.categoria_esocial}</TableCell>
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

function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
