import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { Identificador, SituacaoIdentificador } from '@/lib/senior/types';
import { AvisoErpBanner } from './AvisoErpBanner';

export function AlterarSituacaoDialog({ ident, onClose, onDone }: {
  ident: Identificador; onClose: () => void; onDone: () => void;
}) {
  const [nova, setNova] = useState<SituacaoIdentificador>(ident.situacao);
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [saving, setSaving] = useState(false);
  const disabled = !motivo.trim() || !confirmar || saving || nova === ident.situacao;

  const submit = async () => {
    setSaving(true);
    try {
      await seniorApi.alterarSituacao({
        codemp: ident.codemp, modsis: ident.modsis, idereg: ident.idereg,
        codtns: ident.codtns ?? '', nova_situacao: nova, motivo: motivo.trim(), confirmar: true,
      });
      toast.success('Situação alterada.');
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao alterar situação');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar situação — {ident.idereg}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <AvisoErpBanner />
          <div className="text-xs text-muted-foreground">
            Empresa {ident.codemp} · {ident.modsis} · Transação {ident.codtns ?? '—'}
          </div>
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Nova situação</label>
            <RadioGroup value={nova} onValueChange={(v) => setNova(v as SituacaoIdentificador)} className="flex gap-4">
              {(['A', 'I', 'X'] as SituacaoIdentificador[]).map((s) => (
                <label key={s} className="flex items-center gap-1 text-sm">
                  <RadioGroupItem value={s} /> {s === 'A' ? 'Ativo (A)' : s === 'I' ? 'Inativo (I)' : 'Teste (X)'}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Motivo *</label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={confirmar} onCheckedChange={(c) => setConfirmar(c === true)} />
            Confirmo alterar a situação no ERP Senior.
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
