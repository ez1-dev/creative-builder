import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { Identificador } from '@/lib/senior/types';
import { AvisoErpBanner } from './AvisoErpBanner';

export function AlterarRegraDialog({ ident, onClose, onDone }: {
  ident: Identificador; onClose: () => void; onDone: () => void;
}) {
  const [novo, setNovo] = useState<string>(ident.codreg != null ? String(ident.codreg) : '');
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [saving, setSaving] = useState(false);

  const novoNum = Number(novo);
  const disabled = !novo || Number.isNaN(novoNum) || !motivo.trim() || !confirmar || saving;

  const submit = async () => {
    setSaving(true);
    try {
      await seniorApi.alterarRegraVinculada({
        codemp: ident.codemp, modsis: ident.modsis, idereg: ident.idereg,
        codtns: ident.codtns ?? '', novo_codreg: novoNum, motivo: motivo.trim(), confirmar: true,
      });
      toast.success('Regra vinculada alterada.');
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao alterar regra');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar regra vinculada — {ident.idereg}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <AvisoErpBanner />
          <div className="text-xs text-muted-foreground">
            Empresa {ident.codemp} · {ident.modsis} · Atual: {ident.codreg ?? '—'}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Novo código de regra *</label>
            <Input type="number" value={novo} onChange={(e) => setNovo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Motivo *</label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={confirmar} onCheckedChange={(c) => setConfirmar(c === true)} />
            Confirmo alterar a regra vinculada no ERP Senior.
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={disabled}>{saving ? 'Salvando…' : 'Confirmar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
