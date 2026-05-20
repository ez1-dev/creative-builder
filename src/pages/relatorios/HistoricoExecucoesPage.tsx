import { useEffect, useState } from 'react';
import { listExecucoes } from '@/lib/relatorios/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function HistoricoExecucoesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listExecucoes()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Histórico de Execuções</h1>
        <p className="text-sm text-muted-foreground">Execuções recentes dos relatórios.</p>
      </header>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Relatório</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24">Formato</TableHead>
              <TableHead className="w-24 text-right">Linhas</TableHead>
              <TableHead className="w-24 text-right">Tempo (ms)</TableHead>
              <TableHead>Erro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sem execuções registradas.</TableCell></TableRow>
            )}
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{format(new Date(e.executado_em), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                <TableCell>
                  <div className="text-sm">{e.relatorios?.nome ?? '—'}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{e.relatorios?.codigo}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={e.status === 'ok' ? 'default' : 'destructive'}>{e.status}</Badge>
                </TableCell>
                <TableCell className="text-xs uppercase">{e.formato}</TableCell>
                <TableCell className="text-right text-xs font-mono">{e.qtd_linhas ?? '—'}</TableCell>
                <TableCell className="text-right text-xs font-mono">{e.tempo_ms ?? '—'}</TableCell>
                <TableCell className="text-xs text-destructive max-w-md truncate">{e.erro ?? ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
