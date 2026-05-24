import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ParametroRecurso, ParametroRecursoPayload } from '@/lib/producao/cargaApi';
import { parametrosRecursosCloud } from '@/lib/producao/parametrosRecursosCloud';
import { toast } from 'sonner';

const UNIDADES = ['GENIUS', 'ESTRUTURAL', 'APOIO', 'NAO_CLASSIFICADO'];
const TIPOS = ['PRODUCAO', 'TERCEIROS', 'LOGISTICA', 'MANUTENCAO'];

export function ParametroRecursoDialog({
  open, onOpenChange, registro, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  registro: ParametroRecurso | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ParametroRecursoPayload>({
    codemp: 1, codcre: '', descre: '', unidade_negocio: 'NAO_CLASSIFICADO',
    tipo_recurso: 'PRODUCAO', codccu_sugerido: '', considera_carga: true, ativo: true, obs: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (registro) {
      setForm({
        codemp: registro.codemp, codcre: registro.codcre, descre: registro.descre || '',
        unidade_negocio: registro.unidade_negocio, tipo_recurso: registro.tipo_recurso || 'PRODUCAO',
        codccu_sugerido: registro.codccu_sugerido || '', considera_carga: registro.considera_carga,
        ativo: registro.ativo, obs: registro.obs || '',
      });
    } else {
      setForm({ codemp: 1, codcre: '', descre: '', unidade_negocio: 'NAO_CLASSIFICADO',
        tipo_recurso: 'PRODUCAO', codccu_sugerido: '', considera_carga: true, ativo: true, obs: '' });
    }
  }, [registro, open]);

  const set = (p: Partial<ParametroRecursoPayload>) => setForm((f) => ({ ...f, ...p }));

  const handleSave = async () => {
    if (!form.codcre.trim() || !form.unidade_negocio) {
      toast.error('Preencha código do recurso e unidade de negócio');
      return;
    }
    setSaving(true);
    try {
      if (registro) await parametrosRecursosCloud.atualizar(registro.id, form);
      else await parametrosRecursosCloud.criar(form);
      toast.success('Parâmetro salvo');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{registro ? 'Editar parâmetro' : 'Novo parâmetro de recurso'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Código empresa</Label>
            <Input type="number" className="h-8 text-xs" value={form.codemp} onChange={(e) => set({ codemp: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">Centro recurso (codcre)</Label>
            <Input className="h-8 text-xs" value={form.codcre} onChange={(e) => set({ codcre: e.target.value })} disabled={!!registro} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Descrição</Label>
            <Input className="h-8 text-xs" value={form.descre || ''} onChange={(e) => set({ descre: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Unidade de negócio</Label>
            <Select value={form.unidade_negocio} onValueChange={(v) => set({ unidade_negocio: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo de recurso</Label>
            <Select value={form.tipo_recurso || ''} onValueChange={(v) => set({ tipo_recurso: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Centro de custo sugerido</Label>
            <Input className="h-8 text-xs" value={form.codccu_sugerido || ''} onChange={(e) => set({ codccu_sugerido: e.target.value })} />
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={form.considera_carga} onCheckedChange={(c) => set({ considera_carga: c })} />
              Considera carga
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={form.ativo} onCheckedChange={(c) => set({ ativo: c })} />
              Ativo
            </label>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Observação</Label>
            <Textarea className="text-xs" rows={2} value={form.obs || ''} onChange={(e) => set({ obs: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
