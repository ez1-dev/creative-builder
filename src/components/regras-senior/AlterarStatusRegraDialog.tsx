import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { RegraLSP, StatusRegra } from '@/lib/senior/types';
import { AvisoErpBanner } from './AvisoErpBanner';

import { STATUS_REGRA_OPTS } from './StatusRegraBadge';
const OPTS = STATUS_REGRA_OPTS;

export function AlterarStatusRegraDialog({ regra, onClose, onDone }: {
  regra: RegraLSP; onClose: () => void; onDone: () => void;
}) {
  const [novoStatus, setNovoStatus] = useState<StatusRegra>(regra.status_regra);
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [saving, setSaving] = useState(false);

  const disabled = !motivo.trim() || !confirmar || saving || novoStatus === regra.status_regra;

  const submit = async () => {
    setSaving(true);
    try {
      await seniorApi.alterarStatusRegra(regra.id, novoStatus, motivo.trim());
      toast.success('Status alterado com sucesso.');
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao alterar status');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar status — {regra.nome_regra}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <AvisoErpBanner />
          <div>
            <label className="text-xs text-muted-foreground">Novo status</label>
            <Select value={novoStatus} onValueChange={(v) => setNovoStatus(v as StatusRegra)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Motivo *</label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={confirmar} onCheckedChange={(c) => setConfirmar(c === true)} />
            Confirmo a alteração.
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
