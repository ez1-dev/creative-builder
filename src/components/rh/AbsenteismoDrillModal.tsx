import { useMemo } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { AbsenteismoDetalheItem } from "@/lib/rh/types";

function formatDateBR(s?: string | null) {
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

const fmtInt = (n?: number | null) =>
  (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  itens: AbsenteismoDetalheItem[];
}

export function AbsenteismoDrillModal({ open, onOpenChange, titulo, itens }: Props) {
  const rows = useMemo(
    () =>
      [...itens].sort((a, b) =>
        String(b?.dt_inicio ?? "").localeCompare(String(a?.dt_inicio ?? "")),
      ),
    [itens],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            {titulo} — {itens.length} afastamento{itens.length === 1 ? "" : "s"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-auto">
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
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Cód. Situação</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead>CID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.matricula}-${r.dt_inicio}-${i}`}>
                    <TableCell className="whitespace-nowrap">{r.colaborador ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.matricula ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.cargo ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.empresa ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.filial ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.centro_custo ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.motivo ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.categoria ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.codsit ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateBR(r.dt_inicio)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateBR(r.dt_fim)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.dias)}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.cid ?? "-"}</TableCell>
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
