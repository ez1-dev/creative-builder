import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type {
  ProgramacaoFeriasDetalheItem,
  DeFeriasDetalheItem,
  StatusPeriodoFerias,
} from "@/lib/rh/types";

const formatDateBR = (s?: string | null) => {
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

const fmtQtd = (v: any): string => {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (!isFinite(n)) return "-";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function StatusBadge({ status }: { status?: StatusPeriodoFerias }) {
  const s = status ?? "";
  const cls =
    s === "VENCIDA"
      ? "bg-red-700 text-white hover:bg-red-700"
      : s === "A VENCER 30 DIAS"
      ? "bg-amber-500 text-white hover:bg-amber-500"
      : s === "A VENCER 60 DIAS"
      ? "bg-lime-500 text-white hover:bg-lime-500"
      : s === "A VENCER 90 DIAS"
      ? "bg-green-700 text-white hover:bg-green-700"
      : "bg-slate-500 text-white hover:bg-slate-500";
  return <Badge className={cls}>{s || "-"}</Badge>;
}

export type DrillMode = "periodo" | "de_ferias";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  mode: DrillMode;
  rows: ProgramacaoFeriasDetalheItem[] | DeFeriasDetalheItem[];
  headerNote?: string;
}

export function ProgramacaoFeriasDrillModal({
  open,
  onOpenChange,
  title,
  mode,
  rows,
  headerNote,
}: Props) {
  const sorted = useMemo(() => {
    const arr = [...(rows ?? [])];
    if (mode === "periodo") {
      arr.sort((a: any, b: any) => String(a.dt_limite_saida ?? "").localeCompare(String(b.dt_limite_saida ?? "")));
    } else {
      arr.sort((a: any, b: any) => String(a.colaborador ?? "").localeCompare(String(b.colaborador ?? ""), "pt-BR"));
    }
    return arr;
  }, [rows, mode]);

  const unidade = mode === "periodo" ? "períodos" : "colaboradores";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {title} — {sorted.length} {unidade}
          </DialogTitle>
          {headerNote && (
            <p className="text-sm text-muted-foreground pt-1">{headerNote}</p>
          )}
        </DialogHeader>

        <div className="max-h-[65vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              {mode === "periodo" ? (
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Início Período</TableHead>
                  <TableHead>Fim Período</TableHead>
                  <TableHead>Limite Saída</TableHead>
                  <TableHead className="text-right">Dias Direito</TableHead>
                  <TableHead className="text-right">Dias Saldo</TableHead>
                  <TableHead className="text-right">Dias Programado</TableHead>
                  <TableHead className="text-right">Dias Abono</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Início das Férias</TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={mode === "periodo" ? 14 : 7} className="text-center text-muted-foreground py-6">
                    Sem dados
                  </TableCell>
                </TableRow>
              )}
              {mode === "periodo" &&
                (sorted as ProgramacaoFeriasDetalheItem[]).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.colaborador ?? "-"}</TableCell>
                    <TableCell>{r.matricula ?? "-"}</TableCell>
                    <TableCell>{r.empresa ?? "-"}</TableCell>
                    <TableCell>{r.filial ?? "-"}</TableCell>
                    <TableCell>{r.centro_custo ?? "-"}</TableCell>
                    <TableCell>{r.cargo ?? "-"}</TableCell>
                    <TableCell>{formatDateBR(r.dt_inicio_periodo)}</TableCell>
                    <TableCell>{formatDateBR(r.dt_fim_periodo)}</TableCell>
                    <TableCell>{formatDateBR(r.dt_limite_saida)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_direito)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_saldo)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_programado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_abono)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
              {mode === "de_ferias" &&
                (sorted as DeFeriasDetalheItem[]).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.colaborador ?? "-"}</TableCell>
                    <TableCell>{r.matricula ?? "-"}</TableCell>
                    <TableCell>{r.empresa ?? "-"}</TableCell>
                    <TableCell>{r.filial ?? "-"}</TableCell>
                    <TableCell>{r.centro_custo ?? "-"}</TableCell>
                    <TableCell>{r.cargo ?? "-"}</TableCell>
                    <TableCell>{formatDateBR(r.dt_inicio_ferias)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
