import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Trash2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

interface PrioridadeRow {
  id: string;
  codemp: number;
  numorp: string;
  prioridade: number;
  observacao: string | null;
  updated_at: string;
}

export function PrioridadeOpTab() {
  const qc = useQueryClient();
  const [novo, setNovo] = useState({ codemp: 1, numorp: '', prioridade: 1, observacao: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['producao_prioridade_op'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producao_prioridade_op')
        .select('*')
        .order('prioridade', { ascending: true })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PrioridadeRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<PrioridadeRow> & { codemp: number; numorp: string; prioridade: number }) => {
      const { error } = await supabase
        .from('producao_prioridade_op')
        .upsert(
          {
            codemp: row.codemp,
            numorp: row.numorp,
            prioridade: row.prioridade,
            observacao: row.observacao ?? null,
            atualizado_por: (await supabase.auth.getUser()).data.user?.id ?? null,
          },
          { onConflict: 'codemp,numorp' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Prioridade salva');
      qc.invalidateQueries({ queryKey: ['producao_prioridade_op'] });
    },
    onError: (e: any) => toast.error('Erro', { description: e?.message ?? String(e) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('producao_prioridade_op').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removido');
      qc.invalidateQueries({ queryKey: ['producao_prioridade_op'] });
    },
    onError: (e: any) => toast.error('Erro', { description: e?.message ?? String(e) }),
  });

  const handleAdd = () => {
    if (!novo.numorp.trim()) {
      toast.error('Informe o número da OP');
      return;
    }
    upsert.mutate(novo, {
      onSuccess: () => setNovo({ codemp: novo.codemp, numorp: '', prioridade: 1, observacao: '' }),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <p className="text-xs text-muted-foreground mb-2">
          Sobrescreve a prioridade vinda do ERP por OP. Quanto menor, mais urgente.
          A geração de programação usa esses valores em vez da prioridade original.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
          <div>
            <Label className="text-xs">Empresa</Label>
            <Input type="number" className="h-8 text-xs" value={novo.codemp}
              onChange={(e) => setNovo({ ...novo, codemp: Number(e.target.value) || 1 })} />
          </div>
          <div>
            <Label className="text-xs">Nº OP</Label>
            <Input className="h-8 text-xs" value={novo.numorp}
              onChange={(e) => setNovo({ ...novo, numorp: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Prioridade</Label>
            <Input type="number" className="h-8 text-xs" value={novo.prioridade}
              onChange={(e) => setNovo({ ...novo, prioridade: Number(e.target.value) || 1 })} />
          </div>
          <div className="sm:col-span-1">
            <Label className="text-xs">Observação</Label>
            <Input className="h-8 text-xs" value={novo.observacao}
              onChange={(e) => setNovo({ ...novo, observacao: e.target.value })} />
          </div>
          <div>
            <Button size="sm" className="h-8 text-xs gap-1 w-full" onClick={handleAdd} disabled={upsert.isPending}>
              <Plus className="h-3.5 w-3.5" /> Adicionar / Atualizar
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Empresa</TableHead>
              <TableHead className="text-xs">Nº OP</TableHead>
              <TableHead className="text-xs">Prioridade</TableHead>
              <TableHead className="text-xs">Observação</TableHead>
              <TableHead className="text-xs">Atualizado</TableHead>
              <TableHead className="text-xs w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-xs text-muted-foreground py-6 text-center">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={6} className="text-xs text-muted-foreground py-6 text-center">Nenhuma prioridade manual cadastrada.</TableCell></TableRow>
            )}
            {(data ?? []).map((r) => (
              <PriorityRow key={r.id} row={r}
                onSave={(p) => upsert.mutate({ ...r, ...p })}
                onRemove={() => remove.mutate(r.id)} />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function PriorityRow({ row, onSave, onRemove }: { row: PrioridadeRow; onSave: (p: Partial<PrioridadeRow>) => void; onRemove: () => void }) {
  const [prio, setPrio] = useState(row.prioridade);
  const [obs, setObs] = useState(row.observacao ?? '');
  const dirty = prio !== row.prioridade || (obs ?? '') !== (row.observacao ?? '');
  return (
    <TableRow>
      <TableCell className="text-xs">{row.codemp}</TableCell>
      <TableCell className="text-xs font-mono">{row.numorp}</TableCell>
      <TableCell className="text-xs">
        <Input type="number" className="h-7 text-xs w-20" value={prio}
          onChange={(e) => setPrio(Number(e.target.value) || 1)} />
      </TableCell>
      <TableCell className="text-xs">
        <Input className="h-7 text-xs" value={obs} onChange={(e) => setObs(e.target.value)} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{new Date(row.updated_at).toLocaleString()}</TableCell>
      <TableCell className="text-xs">
        <div className="flex gap-1">
          {dirty && (
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onSave({ prioridade: prio, observacao: obs })}>
              <Save className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
