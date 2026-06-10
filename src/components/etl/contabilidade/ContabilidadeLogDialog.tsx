import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw } from 'lucide-react';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { getContabilidadeLog, type ContabLogItem } from '@/lib/bi/contabilidadeApi';
import { STATUS_COLOR, statusLabel } from './statusUi';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString('pt-BR');
};

export function ContabilidadeLogDialog({ open, onOpenChange }: Props) {
  const q = useQuery({
    queryKey: ['contab-log'],
    queryFn: () => getContabilidadeLog(100),
    enabled: open,
  });

  const cols: Column<ContabLogItem>[] = [
    { key: 'ordem', header: 'Ordem', render: (_v, r) => r.ordem ?? '—' },
    { key: 'nome_acao', header: 'Ação', render: (_v, r) => <span className="font-mono">{r.nome_acao}</span> },
    { key: 'tabela_supabase', header: 'Tabela', render: (_v, r) => <span className="font-mono text-xs">{r.tabela_supabase ?? '—'}</span> },
    { key: 'anomes_ini', header: 'Ano/Mês Ini' },
    { key: 'anomes_fim', header: 'Ano/Mês Fim' },
    {
      key: 'status',
      header: 'Status',
      render: (_v, r) => {
        const k = (r.status ?? '').toUpperCase();
        return <Badge className={STATUS_COLOR[k] ?? STATUS_COLOR.SEM_DADOS} variant="secondary">{statusLabel(r.status)}</Badge>;
      },
    },
    { key: 'qtd_linhas', header: 'Linhas', render: (_v, r) => r.qtd_linhas ?? '—' },
    {
      key: 'erro',
      header: 'Erro',
      render: (_v, r) => {
        if (!r.erro) return <span className="text-muted-foreground">—</span>;
        const short = r.erro.length > 40 ? r.erro.slice(0, 40) + '…' : r.erro;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-destructive text-xs cursor-help">{short}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-md whitespace-pre-wrap text-xs">{r.erro}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    { key: 'acionado_por', header: 'Por' },
    { key: 'iniciado_em', header: 'Iniciado', render: (_v, r) => <span className="text-xs">{fmtDate(r.iniciado_em)}</span> },
    { key: 'finalizado_em', header: 'Finalizado', render: (_v, r) => <span className="text-xs">{fmtDate(r.finalizado_em)}</span> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Log de execuções — ATU_CONTABILIDADE
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${q.isFetching ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {q.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <DataTable columns={cols} data={q.data ?? []} emptyMessage="Sem execuções registradas" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
