import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { FormularioDialog } from "@/components/rh/FormularioDialog";
import { atualizarStatusFormulario, fetchFormularios } from "@/lib/rh/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIPOS = ["FERIAS", "CONTRATO_EXPERIENCIA", "ATESTADO", "ALTERACAO_CADASTRAL", "OUTROS"];
const STATUS = ["ABERTO", "EM_ANALISE", "CONCLUIDO", "CANCELADO"];

function statusBadgeCls(s?: string) {
  const v = (s || "").toUpperCase();
  if (v === "ABERTO") return "bg-blue-500 text-white";
  if (v === "EM_ANALISE") return "bg-yellow-400 text-yellow-950";
  if (v === "CONCLUIDO") return "bg-green-600 text-white";
  if (v === "CANCELADO") return "bg-destructive text-destructive-foreground";
  return "bg-muted text-muted-foreground";
}

export default function FormulariosPage() {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState("__all__");
  const [statusF, setStatusF] = useState("__all__");
  const [busca, setBusca] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["rh", "formularios"],
    queryFn: fetchFormularios,
  });

  const rows = useMemo(() => data.filter((r) => {
    if (tipo !== "__all__" && r.cd_tp_formulario !== tipo) return false;
    if (statusF !== "__all__" && r.cd_status !== statusF) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!(r.cd_matricula || "").toString().toLowerCase().includes(q) &&
          !(r.ds_colaborador || "").toLowerCase().includes(q) &&
          !(r.ds_titulo || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [data, tipo, statusF, busca]);

  const mut = useMutation({
    mutationFn: ({ id, status }: { id: number | string; status: string }) =>
      atualizarStatusFormulario(id, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["rh", "formularios"] });
    },
    onError: (e: any) => toast.error("Falha ao atualizar status", { description: e?.message }),
  });

  return (
    <div className="container mx-auto px-3 md:px-6 py-4 md:py-6">
      <RhPageHeader title="99 — Formulários" subtitle="Registros complementares do módulo de RH" actions={<FormularioDialog />} />

      <Card className="mb-4">
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Busca (matrícula / colaborador / título)</Label><Input value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="max-h-[70vh] overflow-auto -mx-3 px-3 md:mx-0 md:px-0">
            <Table>

              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alterar status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6" /></TableCell></TableRow>
                ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhum formulário</TableCell></TableRow>
                )}
                {rows.map((f, i) => (
                  <TableRow key={f.id ?? i}>
                    <TableCell><Badge variant="outline">{f.cd_tp_formulario}</Badge></TableCell>
                    <TableCell>
                      <div className="font-medium">{f.ds_titulo}</div>
                      {f.ds_descricao && <div className="text-xs text-muted-foreground line-clamp-1">{f.ds_descricao}</div>}
                    </TableCell>
                    <TableCell>{f.cd_matricula}</TableCell>
                    <TableCell>{f.ds_colaborador}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", statusBadgeCls(f.cd_status))}>
                        {f.cd_status || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {f.id != null ? (
                        <Select
                          value={f.cd_status || ""}
                          onValueChange={(v) => mut.mutate({ id: f.id!, status: v })}
                          disabled={mut.isPending}
                        >
                          <SelectTrigger className="h-8 w-[150px]"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{formatDate(f.criado_em)}</TableCell>
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
