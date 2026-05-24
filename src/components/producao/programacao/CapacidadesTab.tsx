import { useEffect, useMemo, useState } from 'react';
import { useCapacidades, useSalvarCapacidades } from '@/hooks/useProgramacao';
import type { CapacidadeRow } from '@/lib/producao/programacaoApi';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Plus, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const empty = (): CapacidadeRow => ({
  codemp: 1,
  codcre: '',
  descre: '',
  minutos_dia: 480,
  qtde_recursos: 1,
  eficiencia_perc: 100,
  hora_inicio: '07:00',
  considerar_sabado: false,
  considerar_domingo: false,
  ativo: true,
  obs: '',
});

export function CapacidadesTab({ codemp }: { codemp?: number }) {
  const { data, isLoading, isError, error } = useCapacidades(codemp);
  const mutation = useSalvarCapacidades();

  const [rows, setRows] = useState<CapacidadeRow[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [newRow, setNewRow] = useState<CapacidadeRow>(empty());

  useEffect(() => {
    if (data?.dados) {
      setRows(data.dados);
      setDirty(new Set());
    }
  }, [data]);

  const setCell = (i: number, patch: Partial<CapacidadeRow>) => {
    setRows((rs) => {
      const next = [...rs];
      next[i] = { ...next[i], ...patch };
      return next;
    });
    setDirty((d) => {
      const n = new Set(d);
      n.add(rows[i].codcre || `__new_${i}`);
      return n;
    });
  };

  const onSalvar = async () => {
    try {
      const res = await mutation.mutateAsync(rows);
      toast.success(`${res.salvos ?? rows.length} capacidades salvas`);
      setDirty(new Set());
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e?.message });
    }
  };

  const onReset = () => {
    if (data?.dados) {
      setRows(data.dados);
      setDirty(new Set());
    }
  };

  const onAdd = () => {
    if (!newRow.codcre.trim()) {
      toast.error('Informe o codcre');
      return;
    }
    setRows((rs) => [...rs, newRow]);
    setDirty((d) => {
      const n = new Set(d);
      n.add(newRow.codcre);
      return n;
    });
    setNewRow(empty());
    setAddOpen(false);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b gap-2">
        <div className="text-sm font-semibold">Capacidade dos Recursos · {rows.length} cadastrados</div>
        <div className="flex items-center gap-2">
          {dirty.size > 0 && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
              {dirty.size} alterado(s)
            </Badge>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={onReset} disabled={dirty.size === 0}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo recurso</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="codemp"><Input type="number" className="h-8 text-xs" value={newRow.codemp} onChange={(e) => setNewRow({ ...newRow, codemp: Number(e.target.value) })} /></Field>
                <Field label="codcre"><Input className="h-8 text-xs" value={newRow.codcre} onChange={(e) => setNewRow({ ...newRow, codcre: e.target.value })} /></Field>
                <Field label="Descrição"><Input className="h-8 text-xs" value={newRow.descre || ''} onChange={(e) => setNewRow({ ...newRow, descre: e.target.value })} /></Field>
                <Field label="Minutos/dia"><Input type="number" className="h-8 text-xs" value={newRow.minutos_dia} onChange={(e) => setNewRow({ ...newRow, minutos_dia: Number(e.target.value) })} /></Field>
                <Field label="Qtd recursos"><Input type="number" className="h-8 text-xs" value={newRow.qtde_recursos} onChange={(e) => setNewRow({ ...newRow, qtde_recursos: Number(e.target.value) })} /></Field>
                <Field label="Eficiência %"><Input type="number" className="h-8 text-xs" value={newRow.eficiencia_perc} onChange={(e) => setNewRow({ ...newRow, eficiencia_perc: Number(e.target.value) })} /></Field>
                <Field label="Hora início"><Input type="time" className="h-8 text-xs" value={newRow.hora_inicio} onChange={(e) => setNewRow({ ...newRow, hora_inicio: e.target.value })} /></Field>
                <div className="flex items-center gap-2 pt-5"><Switch checked={newRow.considerar_sabado} onCheckedChange={(v) => setNewRow({ ...newRow, considerar_sabado: v })} /><Label className="text-xs">Sábado</Label></div>
                <div className="flex items-center gap-2"><Switch checked={newRow.considerar_domingo} onCheckedChange={(v) => setNewRow({ ...newRow, considerar_domingo: v })} /><Label className="text-xs">Domingo</Label></div>
                <div className="flex items-center gap-2"><Switch checked={newRow.ativo} onCheckedChange={(v) => setNewRow({ ...newRow, ativo: v })} /><Label className="text-xs">Ativo</Label></div>
              </div>
              <DialogFooter><Button onClick={onAdd}>Adicionar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Button size="sm" className="h-8 text-xs gap-1" onClick={onSalvar} disabled={mutation.isPending || dirty.size === 0}>
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar alterações
          </Button>
        </div>
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
              <TableHead>codemp</TableHead>
              <TableHead>codcre</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Min/dia</TableHead>
              <TableHead className="text-right">Qtd rec.</TableHead>
              <TableHead className="text-right">Efic. %</TableHead>
              <TableHead>Início</TableHead>
              <TableHead className="text-center">Sáb</TableHead>
              <TableHead className="text-center">Dom</TableHead>
              <TableHead className="text-center">Ativo</TableHead>
              <TableHead>Obs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ))}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">Nenhuma capacidade cadastrada</TableCell></TableRow>
            )}
            {!isLoading && rows.map((r, i) => {
              const isDirty = dirty.has(r.codcre || `__new_${i}`);
              return (
                <TableRow key={`${r.codemp}-${r.codcre}-${i}`} className={cn(isDirty && 'bg-amber-500/5')}>
                  <TableCell className="w-20"><Input type="number" className="h-7 text-xs" value={r.codemp} onChange={(e) => setCell(i, { codemp: Number(e.target.value) })} /></TableCell>
                  <TableCell className="w-28"><Input className="h-7 text-xs font-mono" value={r.codcre} onChange={(e) => setCell(i, { codcre: e.target.value })} /></TableCell>
                  <TableCell><Input className="h-7 text-xs" value={r.descre || ''} onChange={(e) => setCell(i, { descre: e.target.value })} /></TableCell>
                  <TableCell className="w-24"><Input type="number" className="h-7 text-xs text-right" value={r.minutos_dia} onChange={(e) => setCell(i, { minutos_dia: Number(e.target.value) })} /></TableCell>
                  <TableCell className="w-20"><Input type="number" className="h-7 text-xs text-right" value={r.qtde_recursos} onChange={(e) => setCell(i, { qtde_recursos: Number(e.target.value) })} /></TableCell>
                  <TableCell className="w-20"><Input type="number" className="h-7 text-xs text-right" value={r.eficiencia_perc} onChange={(e) => setCell(i, { eficiencia_perc: Number(e.target.value) })} /></TableCell>
                  <TableCell className="w-24"><Input type="time" className="h-7 text-xs" value={r.hora_inicio} onChange={(e) => setCell(i, { hora_inicio: e.target.value })} /></TableCell>
                  <TableCell className="text-center"><Switch checked={r.considerar_sabado} onCheckedChange={(v) => setCell(i, { considerar_sabado: v })} /></TableCell>
                  <TableCell className="text-center"><Switch checked={r.considerar_domingo} onCheckedChange={(v) => setCell(i, { considerar_domingo: v })} /></TableCell>
                  <TableCell className="text-center"><Switch checked={r.ativo} onCheckedChange={(v) => setCell(i, { ativo: v })} /></TableCell>
                  <TableCell><Input className="h-7 text-xs" value={r.obs || ''} onChange={(e) => setCell(i, { obs: e.target.value })} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
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
