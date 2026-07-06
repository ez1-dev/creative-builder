import { useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TurnoverAdmitidoDetalhe, TurnoverDemitidoDetalhe } from "@/lib/rh/types";

export const formatDateBR = (s?: string | null) => {
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  tipo: "admitidos" | "demitidos";
  itens: (TurnoverAdmitidoDetalhe | TurnoverDemitidoDetalhe)[];
}

export function TurnoverDrillModal({ open, onOpenChange, titulo, tipo, itens }: Props) {
  const rows = useMemo(() => {
    const key = tipo === "demitidos" ? "dt_demissao" : "dt_admissao";
    return [...itens].sort((a: any, b: any) => String(b?.[key] ?? "").localeCompare(String(a?.[key] ?? "")));
  }, [itens, tipo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{titulo} — {itens.length}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto">
          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Sem dados</div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Data Admissão</TableHead>
                  {tipo === "demitidos" && <TableHead>Data Demissão</TableHead>}
                  {tipo === "demitidos" && <TableHead>Motivo</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any, i) => (
                  <TableRow key={`${r.matricula}-${i}`}>
                    <TableCell className="whitespace-nowrap">{r.colaborador ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.matricula ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.cargo ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.empresa ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.filial ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateBR(r.dt_admissao)}</TableCell>
                    {tipo === "demitidos" && (
                      <TableCell className="whitespace-nowrap">{formatDateBR(r.dt_demissao)}</TableCell>
                    )}
                    {tipo === "demitidos" && (
                      <TableCell className="whitespace-nowrap">{r.motivo ?? "-"}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
