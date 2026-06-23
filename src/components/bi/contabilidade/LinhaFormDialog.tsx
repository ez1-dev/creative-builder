import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  criarLinha,
  atualizarLinha,
  type MontadorLinha,
  type MontadorTipoLinha,
} from '@/lib/bi/dreMontadorModelosApi';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  modeloId: string;
  linha?: MontadorLinha | null;
  onSaved: (l: MontadorLinha) => void;
}

const TIPOS: MontadorTipoLinha[] = ['CONTA', 'CALCULO', 'TOTAL'];

export default function LinhaFormDialog({ open, onOpenChange, modeloId, linha, onSaved }: Props) {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<MontadorTipoLinha>('CONTA');
  const [ordem, setOrdem] = useState<number>(10);
  const [formula, setFormula] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCodigo(linha?.codigo_linha ?? '');
      setDescricao(linha?.descricao ?? '');
      setTipo((linha?.tipo_linha as MontadorTipoLinha) ?? 'CONTA');
      setOrdem(linha?.ordem ?? 10);
      setFormula(linha?.formula ?? '');
      setAtivo(linha?.ativo ?? true);
    }
  }, [open, linha]);

  const salvar = async () => {
    const cod = codigo.trim().toUpperCase();
    if (!cod) { toast.error('Código da linha é obrigatório.'); return; }
    if (!/^[A-Z0-9_]+$/.test(cod)) { toast.error('Use apenas A-Z, 0-9 e _ no código.'); return; }
    if (!descricao.trim()) { toast.error('Descrição é obrigatória.'); return; }
    if (tipo !== 'CONTA' && !formula.trim()) { toast.error('Fórmula é obrigatória para CALCULO/TOTAL.'); return; }

    setSaving(true);
    try {
      const payload = {
        modelo_id: modeloId,
        codigo_linha: cod,
        descricao: descricao.trim(),
        tipo_linha: tipo,
        ordem: Number(ordem) || 0,
        formula: tipo === 'CONTA' ? null : formula.trim(),
        ativo,
      };
      const r = linha?.id ? await atualizarLinha(linha.id, payload) : await criarLinha(payload);
      toast.success(linha?.id ? 'Linha atualizada.' : 'Linha criada.');
      onSaved(r);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar linha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{linha?.id ? 'Editar linha' : 'Nova linha'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código *</Label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="RECEITA_BRUTA"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={ordem} onChange={(e) => setOrdem(Number(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as MontadorTipoLinha)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {tipo !== 'CONTA' && (
            <div>
              <Label>Fórmula *</Label>
              <Input
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="RECEITA_BRUTA-DEDUCOES"
                className="font-mono"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={ativo} onCheckedChange={setAtivo} id="l-ativo" />
            <Label htmlFor="l-ativo">Ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
