import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { FormularioDialog } from "@/components/rh/FormularioDialog";
import { fetchFormularios } from "@/lib/rh/api";
import { formatDate } from "@/lib/format";

export default function FormulariosPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["rh", "formularios"],
    queryFn: fetchFormularios,
  });

  return (
    <div className="container mx-auto py-6">
      <RhPageHeader title="99 — Formulários" actions={<FormularioDialog />} />

      <Card>
        <CardContent className="pt-6">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6" /></TableCell></TableRow>
                ))}
                {!isLoading && data.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum formulário</TableCell></TableRow>
                )}
                {data.map((f, i) => (
                  <TableRow key={f.id ?? i}>
                    <TableCell><Badge variant="outline">{f.cd_tp_formulario}</Badge></TableCell>
                    <TableCell>
                      <div className="font-medium">{f.ds_titulo}</div>
                      {f.ds_descricao && <div className="text-xs text-muted-foreground line-clamp-1">{f.ds_descricao}</div>}
                    </TableCell>
                    <TableCell>{f.cd_matricula}</TableCell>
                    <TableCell>{f.ds_colaborador}</TableCell>
                    <TableCell><Badge>{f.cd_status}</Badge></TableCell>
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
