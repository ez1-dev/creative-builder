import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyCell } from "@/components/contabil/MoneyCell";
import {
  useComposicaoVincular,
  type ComposicaoVincularLinha,
} from "@/hooks/contabil/api";
import { CODEMP, CODFIL } from "@/lib/contabilConfig";
import { fixMojibake } from "@/lib/contabilApi";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modelo de Balanço atualmente aberto na tela. */
  modeloBalancoId: string;
  /** anomes selecionado (ex.: 202605). */
  anomesSelecionado: number | string | null;
  /** Períodos disponíveis no Balanço (response.periodos sem TOTAL_ANO). */
  periodosBalancoDisponiveis?: string[];
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatAnomesLabel(anomes: string | number): string {
  const s = String(anomes);
  if (s.length !== 6) return s;
  const ano = s.slice(0, 4);
  const i = Number(s.slice(4, 6)) - 1;
  return `${MESES[i] ?? s.slice(4, 6)}/${ano}`;
}

function rotuloDescricao(l: ComposicaoVincularLinha): string {
  const code = String(l.codigo_linha ?? "").trim();
  if (code === "9") return "Resultado Líquido";
  return fixMojibake(String(l.descricao_linha ?? ""));
}

export function ComposicaoDREDialog({
  open,
  onOpenChange,
  modeloBalancoId,
  anomesSelecionado,
  periodosBalancoDisponiveis,
}: Props) {
  const periodos = useMemo(
    () =>
      (periodosBalancoDisponiveis ?? [])
        .map(String)
        .filter((p) => p !== "TOTAL_ANO"),
    [periodosBalancoDisponiveis],
  );

  const [anomes, setAnomes] = useState<string>(() =>
    anomesSelecionado
      ? String(anomesSelecionado)
      : (periodos[periodos.length - 1] ?? ""),
  );

  useEffect(() => {
    if (!open) return;
    if (anomesSelecionado) setAnomes(String(anomesSelecionado));
    else if (periodos.length) setAnomes(periodos[periodos.length - 1]);
  }, [open, anomesSelecionado, periodos]);

  const anomesNum = Number(anomes);
  const valido = Number.isFinite(anomesNum) && String(anomesNum).length === 6;

  const q = useComposicaoVincular(
    modeloBalancoId,
    { codemp: CODEMP, codfil: CODFIL, anomes: valido ? anomesNum : null },
    open && valido,
  );

  const linhas = q.data?.linhas ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Composição do Resultado do Exercício</DialogTitle>
          <DialogDescription>
            Estrutura DRE × contas contábeis que compõem a linha VINCULAR do Balanço.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-600">
            Período:{" "}
            <span className="font-medium">
              {valido ? formatAnomesLabel(anomesNum) : "—"}
            </span>
          </div>
          {periodos.length > 0 && (
            <label className="text-xs text-slate-600 flex items-center gap-2">
              Selecionar:
              <select
                className="border rounded px-2 py-1 text-xs bg-white"
                value={anomes}
                onChange={(e) => setAnomes(e.target.value)}
              >
                {periodos.map((p) => (
                  <option key={p} value={p}>
                    {formatAnomesLabel(p)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {q.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {q.isError && !q.isLoading && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">
                Não foi possível carregar a composição.
              </div>
              <div className="text-xs mt-1">
                {(q.error as Error)?.message ?? "Tente novamente em alguns instantes."}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => q.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {!q.isLoading && !q.isError && linhas.length === 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Sem composição calculada para este período.
          </div>
        )}

        {!q.isLoading && !q.isError && linhas.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-1.5 w-20">Código</th>
                    <th className="text-left px-3 py-1.5">Descrição</th>
                    <th className="text-right px-3 py-1.5 w-40">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, idx) => {
                    const tipo = l.tipo_registro;
                    const code = String(l.codigo_linha ?? "").trim();
                    const isConta = tipo === "CONTA_CONTABIL";
                    const isAjuste = tipo === "AJUSTE";
                    const isTotal = tipo === "TOTAL" || code === "9";
                    const isSubtotal = tipo === "SUBTOTAL";
                    const isGrupo = tipo === "GRUPO";

                    if (isConta) {
                      const ctared = l.ctared != null ? String(l.ctared) : "";
                      const clacta = l.clacta ? String(l.clacta) : "";
                      const descta = fixMojibake(String(l.descta ?? ""));
                      const partes = [ctared, clacta].filter(Boolean).join(" · ");
                      const desc = [partes, descta].filter(Boolean).join(" - ");
                      return (
                        <tr key={idx} className="border-t bg-white">
                          <td className="px-3 py-1 text-xs text-slate-400">·</td>
                          <td className="px-3 py-1 pl-8 text-slate-700">
                            {desc || "—"}
                          </td>
                          <td className="px-3 py-1 text-right">
                            <MoneyCell value={l.valor_conta ?? null} emptyAs="dash" />
                          </td>
                        </tr>
                      );
                    }

                    const valor =
                      l.valor_acumulado_linha ?? l.valor_conta ?? null;

                    return (
                      <tr
                        key={idx}
                        className={cn(
                          "border-t",
                          isGrupo && "bg-slate-50",
                          isSubtotal && "font-medium",
                          isTotal && "bg-amber-50 font-semibold",
                          isAjuste && "bg-white italic text-slate-700",
                        )}
                      >
                        <td className="px-3 py-1.5 font-mono text-xs">
                          {code}
                        </td>
                        <td className="px-3 py-1.5">{rotuloDescricao(l)}</td>
                        <td className="px-3 py-1.5 text-right">
                          <MoneyCell value={valor} emptyAs="dash" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500">
              Valores acumulados retornados pela API. Nenhum cálculo é feito no front.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
