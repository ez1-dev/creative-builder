import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { SituacaoIdentificador } from '@/lib/senior/types';
import { AvisoErpBanner } from './AvisoErpBanner';
import { SituacaoBadge } from './SituacaoBadge';

export interface IdentTarget {
  codemp: number;
  modsis: string;
  idereg: string;
  codtns?: string | null;
  situacao?: SituacaoIdentificador;
  codreg?: number | null;
}

export function AlterarSituacaoDialog({ ident, onClose, onDone }: {
  ident: IdentTarget; onClose: () => void; onDone: () => void;
}) {
  const situacaoAtual: SituacaoIdentificador = ident.situacao ?? 'A';
  const [nova, setNova] = useState<SituacaoIdentificador>(situacaoAtual);
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [saving, setSaving] = useState(false);
  const mudou = nova !== situacaoAtual;
  const disabled = !motivo.trim() || !confirmar || saving || !mudou;
  const cruzaAtivacao = mudou && (situacaoAtual === 'A' || nova === 'A');

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

          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="grid grid-cols-2 gap-y-1">
              <div className="text-muted-foreground">Identificador</div>
              <div className="font-medium">{ident.idereg}</div>
              <div className="text-muted-foreground">Empresa</div>
              <div className="font-medium">{ident.codemp}</div>
              <div className="text-muted-foreground">Módulo</div>
              <div className="font-medium">{ident.modsis}</div>
              <div className="text-muted-foreground">Transação</div>
              <div className="font-medium">{ident.codtns ?? '—'}</div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 border-t pt-3">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-muted-foreground">Atual</span>
                <SituacaoBadge value={situacaoAtual} />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-muted-foreground">Nova</span>
                <SituacaoBadge value={nova} />
              </div>
            </div>
          </div>

          {cruzaAtivacao && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>Transição A↔I afeta o comportamento do ERP e pode exigir reinício do Middleware.</span>
            </div>
          )}

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
          <Button onClick={submit} disabled={disabled}>{saving ? 'Salvando…' : 'Confirmar alteração'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
