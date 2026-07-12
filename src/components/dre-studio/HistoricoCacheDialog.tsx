import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { useExecucoesCache } from "@/hooks/contabil/api";
import { cn } from "@/lib/utils";
import { formatAnomes } from "@/lib/anomes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modeloId?: string;
  codfil?: number;
}

function fmtDataHora(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("pt-BR");
  } catch {
    return String(iso);
  }
}

function fmtTempo(ms?: number): string {
  if (!ms || !Number.isFinite(ms)) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function statusBadge(status?: string) {
  const s = String(status ?? "").toUpperCase();
  const cls =
    s === "OK" || s === "SUCESSO" || s === "PROCESSADO"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : s === "ERRO" || s === "FALHA"
        ? "bg-red-100 text-red-800 border-red-200"
        : s === "EXECUTANDO" || s === "PENDENTE"
          ? "bg-amber-100 text-amber-800 border-amber-200"
          : "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium", cls)}>
      {s || "—"}
    </span>
  );
}

export function HistoricoCacheDialog({ open, onOpenChange, modeloId, codfil }: Props) {
  const q = useExecucoesCache({
    enabled: open,
    modelo_id: modeloId,
    codfil: codfil ?? null,
    limit: 50,
  });
  const execs = q.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico do Cache</DialogTitle>
          <DialogDescription>
            Últimas execuções de atualização do cache contábil.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-slate-500">
            {q.isLoading ? "Carregando..." : `${execs.length} execução(ões)`}
          </div>
          <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", q.isFetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {q.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : q.isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            Falha ao carregar histórico: {(q.error as Error)?.message ?? "erro desconhecido"}
          </div>
        ) : execs.length === 0 ? (
          <div className="rounded-md border bg-slate-50 p-4 text-sm text-slate-600 text-center">
            Nenhuma execução registrada para este modelo.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Data/hora</th>
                  <th className="text-left px-3 py-2">Período</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Lidos</th>
                  <th className="text-right px-3 py-2">Gravados</th>
                  <th className="text-right px-3 py-2">Tempo</th>
                  <th className="text-left px-3 py-2">Erro</th>
                </tr>
              </thead>
              <tbody>
                {execs.map((e, idx) => (
                  <tr key={e.execucao_id ?? idx} className="border-t">
                    <td className="px-3 py-1.5 whitespace-nowrap">{fmtDataHora(e.data_hora)}</td>
                    <td className="px-3 py-1.5 font-mono text-xs whitespace-nowrap">
                      {e.anomes_ini ? formatAnomes(String(e.anomes_ini)) : "-"}
                      {" – "}
                      {e.anomes_fim ? formatAnomes(String(e.anomes_fim)) : "-"}
                    </td>
                    <td className="px-3 py-1.5">{statusBadge(e.status)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {(e.registros_lidos ?? 0).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {(e.registros_gravados ?? 0).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtTempo(e.tempo_ms)}</td>
                    <td className="px-3 py-1.5 text-xs text-red-700 max-w-[260px]">
                      {e.erro ? (
                        <span title={String(e.erro)} className="line-clamp-2">
                          {String(e.erro)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
