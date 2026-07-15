import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useJobStatus } from "@/hooks/contabil/api";

interface Props {
  open: boolean;
  modeloId: string;
  jobId: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

export function MaterializacaoDialog({ open, modeloId, jobId, onClose, onRetry }: Props) {
  const qc = useQueryClient();
  const { data: job } = useJobStatus(jobId, open && !!jobId);

  const status = String(job?.status ?? "PENDENTE").toUpperCase();
  const ativo =
    status === "PENDENTE" ||
    status === "PROCESSANDO" ||
    status === "EM_PROCESSAMENTO";
  const concluido = status === "CONCLUIDO";
  const erro = status === "ERRO";

  const processados = job?.processados ?? 0;
  const total = job?.total ?? 0;
  const pctApi = job?.percentual;
  const pct =
    pctApi != null && Number.isFinite(pctApi)
      ? Math.max(0, Math.min(100, Math.round(pctApi as number)))
      : total > 0
        ? Math.min(100, Math.round((processados / total) * 100))
        : 0;
  const etapa = job?.etapa ?? null;

  useEffect(() => {
    if (!open) return;
    if (concluido) {
      qc.invalidateQueries({ queryKey: ["contabil", "resultado-pronto", modeloId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "contabil" && q.queryKey[1] === "resultado-cache" && q.queryKey.includes(modeloId) });
      toast.success("Resultado atualizado.");
      onClose();
    }
  }, [concluido, open, qc, modeloId, onClose]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Não permitir fechar enquanto job estiver em andamento.
        if (!v && ativo) return;
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          if (ativo) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (ativo) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ativo && <Loader2 className="h-4 w-4 animate-spin" />}
            {erro && <AlertTriangle className="h-4 w-4 text-destructive" />}
            Atualizando resultado...
          </DialogTitle>
          <DialogDescription>
            Não feche esta tela.
            <br />
            Processando DRE/Balanço...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Progress value={erro ? 100 : pct} />
          <div className="text-sm text-muted-foreground">
            {total > 0
              ? `Processados ${processados} de ${total} (${pct}%)`
              : pct > 0
                ? `Progresso: ${pct}%`
                : "Aguardando processamento..."}
          </div>
          {etapa && (
            <div className="text-xs text-muted-foreground">
              Etapa: <strong>{etapa}</strong>
            </div>
          )}
          {job?.mensagem && (
            <div className="text-xs text-muted-foreground">{job.mensagem}</div>
          )}
          {erro && (
            <div className="text-sm text-destructive">
              {job?.erro ?? "Falha ao materializar resultado."}
            </div>
          )}
        </div>

        {erro && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            {onRetry && (
              <Button onClick={onRetry}>Tentar novamente</Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
