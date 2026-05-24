import { useState } from 'react';
import { useParametrosRecursos } from '@/hooks/useCargaProducao';
import { ParametroRecurso } from '@/lib/producao/cargaApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, AlertCircle } from 'lucide-react';
import { ParametroRecursoDialog } from './ParametroRecursoDialog';
import { UnidadeNegocioBadge, TipoRecursoBadge } from './badges';

const fmtData = (d?: string) => (d ? new Date(d).toLocaleString('pt-BR') : '—');

export function ParametrosRecursosTab() {
  const { data, isLoading, isError, error, refetch } = useParametrosRecursos();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ParametroRecurso | null>(null);

  const handleNew = () => { setEditing(null); setDialogOpen(true); };
  const handleEdit = (r: ParametroRecurso) => { setEditing(r); setDialogOpen(true); };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="text-sm font-medium">Parâmetros de recursos</div>
        <Button size="sm" onClick={handleNew}><Plus className="mr-1 h-3.5 w-3.5" />Novo</Button>
      </div>

      {isError && (
        <div className="p-6 flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" /> {(error as Error)?.message}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>CCusto sug.</TableHead>
              <TableHead>Carga</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ))}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">Nenhum parâmetro cadastrado</TableCell></TableRow>
            )}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{r.codemp}</TableCell>
                <TableCell className="text-xs font-mono">{r.codcre}</TableCell>
                <TableCell className="text-xs">{r.descre}</TableCell>
                <TableCell><UnidadeNegocioBadge value={r.unidade_negocio} /></TableCell>
                <TableCell><TipoRecursoBadge value={r.tipo_recurso} /></TableCell>
                <TableCell className="text-xs">{r.codccu_sugerido || '—'}</TableCell>
                <TableCell><Badge variant={r.considera_carga ? 'default' : 'outline'} className="text-xs">{r.considera_carga ? 'Sim' : 'Não'}</Badge></TableCell>
                <TableCell><Badge variant={r.ativo ? 'default' : 'outline'} className="text-xs">{r.ativo ? 'Sim' : 'Não'}</Badge></TableCell>
                <TableCell className="text-xs max-w-[240px] truncate">{r.obs || '—'}</TableCell>
                <TableCell className="text-xs">{fmtData(r.updated_at)}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ParametroRecursoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        registro={editing}
        onSaved={() => refetch()}
      />
    </Card>
  );
}
