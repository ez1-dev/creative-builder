import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Pencil, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type LeadTimeRow = {
  id?: string;
  codemp: number;
  codcre: string | null;
  codopr: string | null;
  unidade_negocio: string | null;
  tipo_recurso: string | null;
  leadtime_fixo_dias: number;
  folga_seguranca_dias: number;
  considerar_no_calculo: boolean;
  ativo: boolean;
  obs: string | null;
};

const empty = (): LeadTimeRow => ({
  codemp: 1,
  codcre: '',
  codopr: '',
  unidade_negocio: '',
  tipo_recurso: '',
  leadtime_fixo_dias: 0,
  folga_seguranca_dias: 0,
  considerar_no_calculo: true,
  ativo: true,
  obs: '',
});

const QK = ['producao_leadtime_etapa'] as const;

export function LeadTimesTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producao_leadtime_etapa')
        .select('*')
        .order('codcre', { ascending: true });
      if (error) throw error;
      return (data ?? []) as LeadTimeRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: LeadTimeRow) => {
      const payload = { ...row };
      (['codcre', 'codopr', 'unidade_negocio', 'tipo_recurso', 'obs'] as const).forEach((k) => {
        if (payload[k] === '') (payload as any)[k] = null;
      });
      if (payload.id) {
        const { error } = await supabase.from('producao_leadtime_etapa').update(payload).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('producao_leadtime_etapa').insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Lead time salvo');
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: any) => toast.error('Erro ao salvar', { description: e?.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('producao_leadtime_etapa').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lead time excluído');
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: any) => toast.error('Erro ao excluir', { description: e?.message }),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<LeadTimeRow>(empty());

  const openNew = () => { setEditRow(empty()); setEditOpen(true); };
  const openEdit = (r: LeadTimeRow) => { setEditRow({ ...r }); setEditOpen(true); };
  const onSave = async () => {
    if (!editRow.codcre && !editRow.codopr && !editRow.tipo_recurso) {
      toast.error('Informe pelo menos um critério (centro, operação ou tipo de recurso)');
      return;
    }
    await upsert.mutateAsync(editRow);
    setEditOpen(false);
  };

  const rows = data ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b gap-2">
        <div>
          <div className="text-sm font-semibold">Lead Times por Etapa · {rows.length} parametrizados</div>
          <p className="text-[11px] text-muted-foreground">
            Lead time fixo (ex: cura de pintura, galvanização terceirizada) e folga de segurança somados ao tempo previsto pelo motor APS.
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Novo lead time
        </Button>
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
              <TableHead>Emp</TableHead>
              <TableHead>Centro</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Unid. negócio</TableHead>
              <TableHead>Tipo recurso</TableHead>
              <TableHead className="text-right">LT fixo (d)</TableHead>
              <TableHead className="text-right">Folga (d)</TableHead>
              <TableHead className="text-center">Calc.</TableHead>
              <TableHead className="text-center">Ativo</TableHead>
              <TableHead>Obs</TableHead>
              <TableHead className="text-right w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum lead time cadastrado
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{r.codemp}</TableCell>
                <TableCell className="text-xs font-mono">{r.codcre || '—'}</TableCell>
                <TableCell className="text-xs font-mono">{r.codopr || '—'}</TableCell>
                <TableCell className="text-xs">{r.unidade_negocio || '—'}</TableCell>
                <TableCell className="text-xs">{r.tipo_recurso || '—'}</TableCell>
                <TableCell className="text-right text-xs">{Number(r.leadtime_fixo_dias).toFixed(2)}</TableCell>
                <TableCell className="text-right text-xs">{Number(r.folga_seguranca_dias).toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={r.considerar_no_calculo ? 'default' : 'outline'} className="text-[10px]">
                    {r.considerar_no_calculo ? 'Sim' : 'Não'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={r.ativo ? 'default' : 'outline'} className="text-[10px]">
                    {r.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{r.obs || '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir lead time?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => r.id && remove.mutate(r.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editRow.id ? 'Editar lead time' : 'Novo lead time'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Empresa (codemp)">
              <Input type="number" className="h-8 text-xs" value={editRow.codemp}
                onChange={(e) => setEditRow({ ...editRow, codemp: Number(e.target.value) })} />
            </Field>
            <Field label="Centro de recurso (codcre)">
              <Input className="h-8 text-xs" value={editRow.codcre || ''} onChange={(e) => setEditRow({ ...editRow, codcre: e.target.value })} />
            </Field>
            <Field label="Operação (codopr)">
              <Input className="h-8 text-xs" value={editRow.codopr || ''} onChange={(e) => setEditRow({ ...editRow, codopr: e.target.value })} />
            </Field>
            <Field label="Unidade de negócio">
              <Input className="h-8 text-xs" value={editRow.unidade_negocio || ''} onChange={(e) => setEditRow({ ...editRow, unidade_negocio: e.target.value })} />
            </Field>
            <Field label="Tipo de recurso">
              <Input className="h-8 text-xs" value={editRow.tipo_recurso || ''} onChange={(e) => setEditRow({ ...editRow, tipo_recurso: e.target.value })} />
            </Field>
            <Field label="Lead time fixo (dias)">
              <Input type="number" step="0.25" className="h-8 text-xs" value={editRow.leadtime_fixo_dias}
                onChange={(e) => setEditRow({ ...editRow, leadtime_fixo_dias: Number(e.target.value) })} />
            </Field>
            <Field label="Folga de segurança (dias)">
              <Input type="number" step="0.25" className="h-8 text-xs" value={editRow.folga_seguranca_dias}
                onChange={(e) => setEditRow({ ...editRow, folga_seguranca_dias: Number(e.target.value) })} />
            </Field>
            <div className="col-span-2">
              <Field label="Observação">
                <Textarea rows={2} className="text-xs" value={editRow.obs || ''} onChange={(e) => setEditRow({ ...editRow, obs: e.target.value })} />
              </Field>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={editRow.considerar_no_calculo} onCheckedChange={(v) => setEditRow({ ...editRow, considerar_no_calculo: v })} />
              <Label className="text-xs">Considerar no cálculo</Label>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={editRow.ativo} onCheckedChange={(v) => setEditRow({ ...editRow, ativo: v })} />
              <Label className="text-xs">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={onSave} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
