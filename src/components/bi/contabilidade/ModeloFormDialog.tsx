import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  criarModelo,
  atualizarModelo,
  type MontadorModelo,
} from '@/lib/bi/dreMontadorModelosApi';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  modelo?: MontadorModelo | null;
  onSaved: (m: MontadorModelo) => void;
}

export default function ModeloFormDialog({ open, onOpenChange, modelo, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [padrao, setPadrao] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(modelo?.nome ?? '');
      setDescricao(modelo?.descricao ?? '');
      setPadrao(!!modelo?.padrao);
      setAtivo(modelo?.ativo ?? true);
    }
  }, [open, modelo]);

  const salvar = async () => {
    if (!nome.trim()) { toast.error('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = { nome: nome.trim(), descricao: descricao.trim() || null, padrao, ativo };
      const r = modelo?.id ? await atualizarModelo(modelo.id, payload) : await criarModelo(payload);
      toast.success(modelo?.id ? 'Modelo atualizado.' : 'Modelo criado.');
      onSaved(r);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar modelo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modelo?.id ? 'Editar modelo' : 'Novo modelo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={padrao} onCheckedChange={setPadrao} id="m-padrao" />
              <Label htmlFor="m-padrao">Padrão</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ativo} onCheckedChange={setAtivo} id="m-ativo" />
              <Label htmlFor="m-ativo">Ativo</Label>
            </div>
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
