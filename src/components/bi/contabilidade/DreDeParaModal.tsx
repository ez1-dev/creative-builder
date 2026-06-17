import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  criarRegra, atualizarRegra, type DreDeParaRegra,
} from '@/lib/bi/dreDeparaApi';
import { DRE_MASCARAS_DEPARA, CENTRO_CUSTOS_TODAS } from '@/lib/bi/dreDepara';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  regra?: DreDeParaRegra | null;
  onSaved: () => void;
}

export function DreDeParaModal({ open, onOpenChange, regra, onSaved }: Props) {
  const [conta, setConta] = useState('');
  const [centro, setCentro] = useState('');
  const [aplicaTodos, setAplicaTodos] = useState(false);
  const [mascara, setMascara] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setConta(regra?.cd_conta_contabil ?? '');
      const ccu = regra?.cd_centro_custos ?? '';
      setAplicaTodos(ccu === CENTRO_CUSTOS_TODAS);
      setCentro(ccu === CENTRO_CUSTOS_TODAS ? '' : ccu);
      setMascara(regra?.cd_mascara_dre ?? '');
      setDescricao(regra?.descricao ?? '');
      setAtivo(regra?.ativo ?? true);
    }
  }, [open, regra]);

  const podeSalvar =
    conta.trim().length > 0 &&
    (aplicaTodos || centro.trim().length > 0) &&
    mascara.length > 0;

  const salvar = async () => {
    if (!podeSalvar) return;
    setSaving(true);
    try {
      const payload = {
        cd_conta_contabil: conta,
        cd_centro_custos: aplicaTodos ? CENTRO_CUSTOS_TODAS : centro,
        cd_mascara_dre: mascara,
        descricao: descricao.trim() || null,
        ativo,
      };
      if (regra) {
        await atualizarRegra(regra.id, payload);
        toast.success('Regra atualizada.');
      } else {
        await criarRegra(payload);
        toast.success('Regra criada.');
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Falha ao salvar: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{regra ? 'Editar regra de classificação' : 'Nova regra de classificação'}</DialogTitle>
          <DialogDescription className="text-xs">
            Define para qual linha da DRE os lançamentos de uma conta contábil + centro de custos devem ir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Conta contábil</Label>
            <Input
              className="h-9 text-xs"
              value={conta}
              onChange={(e) => setConta(e.target.value.toUpperCase())}
              placeholder="ex.: 3.1.01.0001"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Centro de custos</Label>
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={aplicaTodos}
                  onCheckedChange={(v) => setAplicaTodos(v === true)}
                />
                Aplicar a todos os centros (TODAS)
              </label>
            </div>
            <Input
              className="h-9 text-xs"
              value={aplicaTodos ? CENTRO_CUSTOS_TODAS : centro}
              disabled={aplicaTodos}
              onChange={(e) => setCentro(e.target.value.toUpperCase())}
              placeholder="ex.: 01.001"
            />
          </div>

          <div>
            <Label className="text-xs">Máscara da DRE (linha destino)</Label>
            <Select value={mascara} onValueChange={setMascara}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione a linha da DRE" />
              </SelectTrigger>
              <SelectContent>
                {DRE_MASCARAS_DEPARA.map((m) => (
                  <SelectItem key={m.codigo} value={m.codigo} className="text-xs">
                    <span className="font-mono mr-2">{m.codigo}</span>{m.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Descrição (opcional)</Label>
            <Textarea
              className="text-xs min-h-[60px]"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Observação interna sobre a regra"
            />
          </div>

          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} />
            Regra ativa
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={salvar} disabled={!podeSalvar || saving}>
            {saving ? 'Salvando...' : 'Salvar regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
