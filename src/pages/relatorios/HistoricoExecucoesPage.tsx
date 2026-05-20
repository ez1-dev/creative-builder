import { useEffect, useMemo, useState } from 'react';
import { listExecucoes } from '@/lib/relatorios/api';
import { formatTempoMs } from '@/lib/relatorios/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

export default function HistoricoExecucoesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'erro'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listExecucoes()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      const nome = (r.relatorios?.nome ?? '').toLowerCase();
      const codigo = (r.relatorios?.codigo ?? '').toLowerCase();
      return nome.includes(q) || codigo.includes(q);
    });
  }, [rows, statusFilter, search]);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Histórico de Execuções</h1>
        <p className="text-sm text-muted-foreground">Execuções recentes dos relatórios.</p>
      </header>

      <Card className="p-3 mb-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou nome do relatório..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ok">Somente OK</SelectItem>
            <SelectItem value="erro">Somente Erro</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} de {rows.length}</span>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Data/Hora</TableHead>
              <TableHead>Relatório</TableHead>
              <TableHead className="w-28">Tipo</TableHead>
              <TableHead className="w-24">Formato</TableHead>
              <TableHead className="w-24 text-right">Linhas</TableHead>
              <TableHead className="w-24 text-right">Tempo</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Erro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sem execuções registradas.</TableCell></TableRow>
            )}
            {filtered.map((e) => {
              const isErro = e.status === 'erro';
              const tipo = e.formato === 'grid' ? 'Preview' : 'Exportação';
              return (
                <TableRow key={e.id} className={cn(isErro && 'bg-destructive/5')}>
                  <TableCell className="text-xs font-mono">{format(new Date(e.executado_em), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                  <TableCell>
                    <div className="text-sm">{e.relatorios?.nome ?? '—'}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{e.relatorios?.codigo}</div>
                  </TableCell>
                  <TableCell className="text-xs">{tipo}</TableCell>
                  <TableCell><Badge variant="outline" className="uppercase text-[10px]">{e.formato}</Badge></TableCell>
                  <TableCell className="text-right text-xs font-mono">{e.qtd_linhas ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{formatTempoMs(e.tempo_ms)}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px]', isErro ? 'bg-destructive text-destructive-foreground' : 'bg-emerald-600 text-white hover:bg-emerald-600')}>
                      {isErro ? 'erro' : 'ok'}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('text-xs max-w-md truncate', isErro && 'text-destructive')} title={e.erro ?? ''}>{e.erro ?? ''}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
