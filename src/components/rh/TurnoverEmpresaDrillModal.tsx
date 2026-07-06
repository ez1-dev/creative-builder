import { useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TurnoverAdmitidoDetalhe, TurnoverDemitidoDetalhe } from "@/lib/rh/types";
import { formatDateBR } from "./TurnoverDrillModal";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  empresa: string;
  admitidos: TurnoverAdmitidoDetalhe[];
  demitidos: TurnoverDemitidoDetalhe[];
}

export function TurnoverEmpresaDrillModal({ open, onOpenChange, empresa, admitidos, demitidos }: Props) {
  const adm = useMemo(
    () => [...admitidos].sort((a, b) => String(b.dt_admissao ?? "").localeCompare(String(a.dt_admissao ?? ""))),
    [admitidos],
  );
  const dem = useMemo(
    () => [...demitidos].sort((a, b) => String(b.dt_demissao ?? "").localeCompare(String(a.dt_demissao ?? ""))),
    [demitidos],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{empresa}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="admitidos">
          <TabsList>
            <TabsTrigger value="admitidos">Admitidos — {adm.length}</TabsTrigger>
            <TabsTrigger value="demitidos">Demitidos — {dem.length}</TabsTrigger>
          </TabsList>
          <TabsContent value="admitidos">
            <div className="max-h-[65vh] overflow-auto">
              {adm.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Sem dados</div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead>Centro de Custo</TableHead>
                      <TableHead>Data Admissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adm.map((r, i) => (
                      <TableRow key={`a-${r.matricula}-${i}`}>
                        <TableCell className="whitespace-nowrap">{r.colaborador ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.matricula ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.cargo ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.filial ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{(r as any).centro_custo ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateBR(r.dt_admissao)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
          <TabsContent value="demitidos">
            <div className="max-h-[65vh] overflow-auto">
              {dem.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Sem dados</div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead>Centro de Custo</TableHead>
                      <TableHead>Data Admissão</TableHead>
                      <TableHead>Data Demissão</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dem.map((r, i) => (
                      <TableRow key={`d-${r.matricula}-${i}`}>
                        <TableCell className="whitespace-nowrap">{r.colaborador ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.matricula ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.cargo ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.filial ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{(r as any).centro_custo ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateBR(r.dt_admissao)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateBR(r.dt_demissao)}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.motivo ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
