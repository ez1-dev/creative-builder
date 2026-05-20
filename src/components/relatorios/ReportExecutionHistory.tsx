import { useEffect, useState, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { listExecucoesPorRelatorio } from '@/lib/relatorios/api';
import { formatTempoMs } from '@/lib/relatorios/format';
import { cn } from '@/lib/utils';

interface Props {
  relatorioId: string;
  refreshKey?: number;
}

type Row = Awaited<ReturnType<typeof listExecucoesPorRelatorio>>[number];

export function ReportExecutionHistory({ relatorioId, refreshKey }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listExecucoesPorRelatorio(relatorioId);
      setRows(data);
    } catch (e: any) {
      toast.error(`Erro ao carregar histórico: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [relatorioId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{rows.length} execução(ões)</div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Atualizar
        </Button>
      </div>
      <div className="rounded-md border border-border overflow-auto max-h-[520px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-40">Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead className="w-28">Tipo</TableHead>
              <TableHead className="w-24">Formato</TableHead>
              <TableHead className="w-24 text-right">Linhas</TableHead>
              <TableHead className="w-24 text-right">Tempo</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Erro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-8">Carregando...</TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sem execuções para este relatório.</TableCell></TableRow>
            )}
            {rows.map((e) => {
              const isErro = e.status === 'erro';
              const tipoExec = e.formato === 'grid' ? 'Preview' : 'Exportação';
              const arquivo = (e.parametros as any)?.__arquivo as string | undefined;
              return (
                <TableRow key={e.id} className={cn(isErro && 'bg-destructive/5')}>
                  <TableCell className="text-xs font-mono">{format(new Date(e.executado_em), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                  <TableCell className="text-xs">{e.executado_por_nome ?? '—'}</TableCell>
                  <TableCell className="text-xs">{tipoExec}</TableCell>
                  <TableCell><Badge variant="outline" className="uppercase text-[10px]">{e.formato}</Badge></TableCell>
                  <TableCell className="text-right text-xs font-mono">{e.qtd_linhas ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{formatTempoMs(e.tempo_ms)}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'text-[10px]',
                        isErro
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-emerald-600 text-white hover:bg-emerald-600',
                      )}
                    >
                      {isErro ? 'erro' : 'ok'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={arquivo}>{arquivo ?? '—'}</TableCell>
                  <TableCell className={cn('text-xs max-w-md truncate', isErro && 'text-destructive')} title={e.erro ?? ''}>
                    {e.erro ?? ''}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
