import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logsExecucao, type LogsResponse } from '@/lib/etl/api';

interface LogsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execucaoId: string | null;
}

const statusColor: Record<string, string> = {
  SUCESSO: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  SUCCESS: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  CONCLUIDA: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  ERRO: 'bg-destructive/20 text-destructive',
  ERROR: 'bg-destructive/20 text-destructive',
  EM_EXECUCAO: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  RUNNING: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  PENDENTE: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
};

const nivelColor: Record<string, string> = {
  INFO: 'text-muted-foreground',
  WARN: 'text-amber-600 dark:text-amber-400',
  WARNING: 'text-amber-600 dark:text-amber-400',
  ERROR: 'text-destructive',
  ERRO: 'text-destructive',
};

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString('pt-BR') : '—');

export function LogsModal({ open, onOpenChange, execucaoId }: LogsModalProps) {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !execucaoId) return;
    setLoading(true);
    logsExecucao(execucaoId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, execucaoId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Logs da execução</DialogTitle>
        </DialogHeader>

        {loading && <Skeleton className="h-48 w-full" />}

        {!loading && data && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="rounded-md border p-3 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{data.execucao.nome_tarefa}</span>
                <Badge className={statusColor[data.execucao.status] ?? 'bg-muted'} variant="secondary">
                  {data.execucao.status}
                </Badge>
              </div>
              <div className="text-muted-foreground">
                Início: {fmtDate(data.execucao.iniciado_em)} • Fim: {fmtDate(data.execucao.finalizado_em)} •
                Linhas: {data.execucao.total_linhas.toLocaleString('pt-BR')}
              </div>
              {data.execucao.mensagem && <div>{data.execucao.mensagem}</div>}
              {data.execucao.erro && <div className="text-destructive">{data.execucao.erro}</div>}
            </div>

            {/* Timeline de ações */}
            {data.acoes.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Ações</div>
                <ol className="relative border-l border-border ml-2 space-y-3">
                  {data.acoes.map((a) => (
                    <li key={a.id} className="ml-4">
                      <span
                        className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background"
                        style={{ backgroundColor: 'hsl(var(--primary))' }}
                      />
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold">
                          {a.ordem}. {a.id_acao}
                        </span>
                        <Badge className={statusColor[a.status] ?? 'bg-muted'} variant="secondary">
                          {a.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {fmtDate(a.iniciado_em)} → {fmtDate(a.finalizado_em)} •{' '}
                        {a.total_linhas.toLocaleString('pt-BR')} linhas
                      </div>
                      {a.mensagem && <div className="text-[11px]">{a.mensagem}</div>}
                      {a.erro && <div className="text-[11px] text-destructive">{a.erro}</div>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Logs */}
            <div>
              <div className="text-xs font-semibold mb-2 uppercase text-muted-foreground">
                Logs ({data.logs.length})
              </div>
              <ScrollArea className="h-64 rounded border">
                <div className="p-2 space-y-1 font-mono text-[11px]">
                  {data.logs.map((l) => (
                    <div key={l.id} className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">{fmtDate(l.criado_em)}</span>
                      <span className={`shrink-0 font-semibold ${nivelColor[l.nivel] ?? ''}`}>
                        [{l.nivel}]
                      </span>
                      {l.origem && <span className="text-muted-foreground shrink-0">{l.origem}</span>}
                      <span className={nivelColor[l.nivel] ?? ''}>{l.mensagem}</span>
                    </div>
                  ))}
                  {data.logs.length === 0 && (
                    <div className="text-muted-foreground text-center py-4">Sem logs</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
