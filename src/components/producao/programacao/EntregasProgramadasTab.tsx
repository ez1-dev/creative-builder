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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Pencil, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type EntregaRow = {
  id?: string;
  codemp: number;
  tipo_entrega: 'OP' | 'OBRA' | 'PROJETO' | 'PRODUTO';
  numorp: string | null;
  numprj: string | null;
  codori: string | null;
  codpro: string | null;
  descricao: string | null;
  data_entrega: string;
  prioridade: number;
  cliente: string | null;
  obra: string | null;
  observacao: string | null;
  ativo: boolean;
};

const empty = (): EntregaRow => ({
  codemp: 1,
  tipo_entrega: 'OP',
  numorp: '',
  numprj: '',
  codori: '',
  codpro: '',
  descricao: '',
  data_entrega: new Date().toISOString().slice(0, 10),
  prioridade: 5,
  cliente: '',
  obra: '',
  observacao: '',
  ativo: true,
});

const QK = ['producao_entrega_programada'] as const;

export function EntregasProgramadasTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producao_entrega_programada')
        .select('*')
        .order('data_entrega', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EntregaRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: EntregaRow) => {
      const payload = { ...row };
      // Normaliza strings vazias para null
      (['numorp', 'numprj', 'codori', 'codpro', 'descricao', 'cliente', 'obra', 'observacao'] as const).forEach((k) => {
        if (payload[k] === '') (payload as any)[k] = null;
      });
      if (payload.id) {
        const { error } = await supabase
          .from('producao_entrega_programada')
          .update(payload)
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('producao_entrega_programada').insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Entrega salva');
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: any) => toast.error('Erro ao salvar', { description: e?.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('producao_entrega_programada').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Entrega excluída');
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: any) => toast.error('Erro ao excluir', { description: e?.message }),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<EntregaRow>(empty());

  const openNew = () => {
    setEditRow(empty());
    setEditOpen(true);
  };
  const openEdit = (r: EntregaRow) => {
    setEditRow({ ...r });
    setEditOpen(true);
  };
  const onSave = async () => {
    if (!editRow.data_entrega) {
      toast.error('Informe a data de entrega');
      return;
    }
    if (editRow.tipo_entrega === 'OP' && !editRow.numorp) {
      toast.error('Para tipo OP informe o número da OP');
      return;
    }
    if (editRow.tipo_entrega === 'PROJETO' && !editRow.numprj) {
      toast.error('Para tipo PROJETO informe o número do projeto');
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
          <div className="text-sm font-semibold">Entregas Programadas · {rows.length} cadastradas</div>
          <p className="text-[11px] text-muted-foreground">
            Datas-alvo informadas pelo PCP, usadas pelo motor APS para programação regressiva e análise de risco.
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Nova entrega
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
              <TableHead>Tipo</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Cliente / Obra</TableHead>
              <TableHead>Data entrega</TableHead>
              <TableHead className="text-right">Prio.</TableHead>
              <TableHead className="text-center">Ativo</TableHead>
              <TableHead className="text-right w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma entrega cadastrada
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.map((r) => {
              const ref = r.tipo_entrega === 'OP' ? r.numorp
                : r.tipo_entrega === 'PROJETO' ? r.numprj
                : r.tipo_entrega === 'PRODUTO' ? r.codpro
                : r.obra;
              return (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.tipo_entrega}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{ref || '—'}</TableCell>
                  <TableCell className="text-xs">{r.descricao || '—'}</TableCell>
                  <TableCell className="text-xs">{[r.cliente, r.obra].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell className="text-xs">{r.data_entrega}</TableCell>
                  <TableCell className="text-right text-xs">{r.prioridade}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={r.ativo ? 'default' : 'outline'} className="text-[10px]">
                      {r.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
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
                            <AlertDialogTitle>Excluir entrega?</AlertDialogTitle>
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
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editRow.id ? 'Editar entrega' : 'Nova entrega programada'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Empresa (codemp)">
              <Input type="number" className="h-8 text-xs" value={editRow.codemp}
                onChange={(e) => setEditRow({ ...editRow, codemp: Number(e.target.value) })} />
            </Field>
            <Field label="Tipo de entrega">
              <Select value={editRow.tipo_entrega} onValueChange={(v) => setEditRow({ ...editRow, tipo_entrega: v as any })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OP">OP</SelectItem>
                  <SelectItem value="OBRA">Obra</SelectItem>
                  <SelectItem value="PROJETO">Projeto</SelectItem>
                  <SelectItem value="PRODUTO">Produto</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Número OP">
              <Input className="h-8 text-xs" value={editRow.numorp || ''} onChange={(e) => setEditRow({ ...editRow, numorp: e.target.value })} />
            </Field>
            <Field label="Número projeto">
              <Input className="h-8 text-xs" value={editRow.numprj || ''} onChange={(e) => setEditRow({ ...editRow, numprj: e.target.value })} />
            </Field>
            <Field label="Cód. origem (codori)">
              <Input className="h-8 text-xs" value={editRow.codori || ''} onChange={(e) => setEditRow({ ...editRow, codori: e.target.value })} />
            </Field>
            <Field label="Cód. produto (codpro)">
              <Input className="h-8 text-xs" value={editRow.codpro || ''} onChange={(e) => setEditRow({ ...editRow, codpro: e.target.value })} />
            </Field>
            <Field label="Cliente">
              <Input className="h-8 text-xs" value={editRow.cliente || ''} onChange={(e) => setEditRow({ ...editRow, cliente: e.target.value })} />
            </Field>
            <Field label="Obra">
              <Input className="h-8 text-xs" value={editRow.obra || ''} onChange={(e) => setEditRow({ ...editRow, obra: e.target.value })} />
            </Field>
            <Field label="Data de entrega">
              <Input type="date" className="h-8 text-xs" value={editRow.data_entrega}
                onChange={(e) => setEditRow({ ...editRow, data_entrega: e.target.value })} />
            </Field>
            <Field label="Prioridade (menor = mais urgente)">
              <Input type="number" className="h-8 text-xs" value={editRow.prioridade}
                onChange={(e) => setEditRow({ ...editRow, prioridade: Number(e.target.value) })} />
            </Field>
            <div className="col-span-2">
              <Field label="Descrição">
                <Input className="h-8 text-xs" value={editRow.descricao || ''} onChange={(e) => setEditRow({ ...editRow, descricao: e.target.value })} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Observação">
                <Textarea rows={2} className="text-xs" value={editRow.observacao || ''} onChange={(e) => setEditRow({ ...editRow, observacao: e.target.value })} />
              </Field>
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
