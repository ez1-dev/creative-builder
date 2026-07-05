import { useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ColaboradorDetalhe } from "@/lib/rh/quadroDashboardApi";

const formatDateBR = (s?: string | null) => {
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  valor: string;
  itens: ColaboradorDetalhe[];
}

const COLS: { key: keyof ColaboradorDetalhe; label: string; fmt?: (v: any) => string }[] = [
  { key: "colaborador", label: "Colaborador" },
  { key: "matricula", label: "Matrícula" },
  { key: "cargo", label: "Cargo" },
  { key: "empresa", label: "Empresa" },
  { key: "filial", label: "Filial" },
  { key: "centro_custo", label: "Centro Custos" },
  { key: "escolaridade", label: "Escolaridade" },
  { key: "faixa_etaria", label: "Faixa Etária" },
  { key: "tempo_casa", label: "Tempo de Casa" },
  { key: "sexo", label: "Sexo" },
  { key: "situacao", label: "Situação" },
  { key: "vinculo", label: "Vínculo" },
  { key: "pcd", label: "PCD" },
  { key: "idade", label: "Idade" },
  { key: "dt_admissao", label: "Data Admissão", fmt: formatDateBR },
];

export function QuadroDrillModal({ open, onOpenChange, label, valor, itens }: Props) {
  const rows = useMemo(
    () =>
      [...itens].sort((a, b) =>
        String(a.colaborador ?? "").localeCompare(String(b.colaborador ?? ""), "pt-BR"),
      ),
    [itens],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {label}: {valor} — {itens.length} colaboradores
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {COLS.map((c) => (
                  <TableHead key={String(c.key)} className="whitespace-nowrap">
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {COLS.map((c) => {
                    const v = r[c.key];
                    const txt = c.fmt ? c.fmt(v) : v === null || v === undefined || v === "" ? "-" : String(v);
                    return (
                      <TableCell key={String(c.key)} className="whitespace-nowrap">
                        {txt}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
