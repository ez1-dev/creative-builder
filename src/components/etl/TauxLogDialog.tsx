import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { getTauxLog, type TauxLogEntry } from '@/lib/bi/tauxApi';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const STATUS_COLOR: Record<string, string> = {
  CONCLUIDO: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  OK: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  EXECUTANDO: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  RUNNING: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  INICIADO: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  EM_EXECUCAO: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  IGNORADA: 'bg-muted text-muted-foreground',
  ERRO: 'bg-destructive/20 text-destructive',
};

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString('pt-BR');
};

export function TauxLogDialog({ open, onOpenChange }: Props) {
  const { data, isFetching, refetch, isLoading } = useQuery({
    queryKey: ['taux-log'],
    queryFn: () => getTauxLog(100),
    enabled: open,
    refetchInterval: open ? 10000 : false,
  });

  const rows: TauxLogEntry[] = data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Log de sincronização — TAUX</DialogTitle>
          <DialogDescription>Últimas 100 execuções registradas pelo backend.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
            )}
            Atualizar
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded border">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem registros de log.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {['TAUX', 'Tabela Cloud', 'Status', 'Linhas', 'Acionado por', 'Iniciado em', 'Finalizado em'].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const s = (r.status ?? '').toUpperCase();
                  return (
                    <tr key={i} className="border-b hover:bg-muted/40">
                      <td className="px-2 py-1 whitespace-nowrap font-medium">{r.nome_tabela}</td>
                      <td className="px-2 py-1 whitespace-nowrap"><code className="text-[11px]">{r.tabela_supabase ?? '—'}</code></td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Badge className={STATUS_COLOR[s] ?? 'bg-muted text-muted-foreground'}>{r.status || '—'}</Badge>
                          {s === 'ERRO' && r.erro && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-xs whitespace-pre-wrap">{r.erro}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-right tabular-nums">
                        {r.qtd_linhas != null ? r.qtd_linhas.toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">{r.acionado_por ?? '—'}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{fmtDate(r.iniciado_em)}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{fmtDate(r.finalizado_em)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
