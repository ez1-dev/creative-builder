import { useState } from "react";
import { AlertTriangle, Eye } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtBRL } from "@/components/contabil/MoneyCell";
import {
  useDiagnosticoCtaredZero,
  type DiagnosticoCtaredZeroItem,
} from "@/hooks/contabil/api";

function fmtAnomes(v: number | string | undefined): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? "");
  const ano = Math.floor(n / 100);
  const mes = n % 100;
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

function fmtData(v: string | undefined): string {
  if (!v) return "";
  // ISO yyyy-mm-dd ou yyyy-mm-ddThh:mm:ss
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return v;
}

function valor(it: DiagnosticoCtaredZeroItem): number {
  return Number(it.VALOR_CTARED_ZERO ?? it.VLRLCT ?? 0);
}

export interface PendenciasCtaredZeroPanelProps {
  enabled: boolean;
  codemp?: number;
  codfil?: number;
  anomes_ini: number;
  anomes_fim: number;
}

export function PendenciasCtaredZeroPanel(props: PendenciasCtaredZeroPanelProps) {
  const [open, setOpen] = useState(false);
  const q = useDiagnosticoCtaredZero({
    enabled: props.enabled,
    codemp: props.codemp,
    codfil: props.codfil,
    anomes_ini: props.anomes_ini,
    anomes_fim: props.anomes_fim,
  });

  if (!props.enabled || q.isLoading || q.isError || !q.data) return null;

  const totalValor = Number(q.data.total_valor_ctared_zero || 0);
  const temValorPendente = Math.abs(totalValor) > 0.005;

  const lancamentosComValor = (q.data.lancamentos ?? []).filter((it) => {
    const v = Number(it.VALOR_CTARED_ZERO ?? it.VLRLCT ?? 0);
    return Math.abs(v) > 0.005;
  });

  // Só exibe se houver valor pendente diferente de zero.
  if (!temValorPendente && lancamentosComValor.length === 0) return null;

  const lancamentos = lancamentosComValor;
  const totalCount = lancamentosComValor.length;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-amber-900">
        Fechamento / Pendências Contábeis
      </div>
      <Alert className="border-amber-300 bg-amber-50 text-amber-900">
        <AlertTriangle className="h-4 w-4 !text-amber-700" />
        <AlertTitle className="text-amber-900">
          Existem lançamentos sem conta contábil / CTARED 0
        </AlertTitle>
        <AlertDescription className="text-amber-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm">
              {totalCount} lançamento(s) — total {fmtBRL(totalValor)}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-900 hover:bg-amber-100"
              onClick={() => setOpen(true)}
              disabled={lancamentos.length === 0}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver lançamentos
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Lançamentos sem conta contábil (CTARED 0)</DialogTitle>
            <DialogDescription>
              Período {fmtAnomes(props.anomes_ini)} a {fmtAnomes(props.anomes_fim)} —{" "}
              {totalCount} lançamento(s), total {fmtBRL(totalValor)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50">
                <TableRow>
                  <TableHead>Anomes</TableHead>
                  <TableHead>Emp/Fil</TableHead>
                  <TableHead>Lote/Lct</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cta Débito</TableHead>
                  <TableHead>Cta Crédito</TableHead>
                  <TableHead className="text-right">Valor lct</TableHead>
                  <TableHead className="text-right">Valor CTARED 0</TableHead>
                  <TableHead>Contrapartida</TableHead>
                  <TableHead>Histórico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-500 py-6">
                      Nenhum lançamento retornado pelo diagnóstico.
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentos.map((it, idx) => {
                    const contrap = [
                      it.CTARED_CONTRAPARTIDA,
                      it.CLACTA_CONTRAPARTIDA,
                      it.DESCTA_CONTRAPARTIDA,
                    ]
                      .filter(Boolean)
                      .join(" - ");
                    return (
                      <TableRow key={`${it.NUMLOT ?? ""}-${it.NUMLCT ?? ""}-${idx}`}>
                        <TableCell className="font-mono text-xs">{fmtAnomes(it.ANOMES)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {it.CODEMP}/{it.CODFIL}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {it.NUMLOT ?? "-"}/{it.NUMLCT ?? "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{fmtData(it.DATLCT)}</TableCell>
                        <TableCell className="font-mono text-xs">{it.CTADEB ?? "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{it.CTACRE ?? "-"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {fmtBRL(Number(it.VLRLCT ?? 0))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {fmtBRL(valor(it))}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{contrap || "-"}</TableCell>
                        <TableCell className="text-xs max-w-[280px] truncate" title={it.CPLLCT}>
                          {it.CPLLCT ?? ""}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
