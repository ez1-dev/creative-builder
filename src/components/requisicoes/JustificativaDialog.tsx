import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  minLength?: number;
  onConfirm: (justificativa: string) => void | Promise<void>;
}

export function JustificativaDialog({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirmar', confirmVariant = 'default',
  minLength = 5, onConfirm,
}: Props) {
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setTxt(''); setBusy(false); } }, [open]);

  const submit = async () => {
    if (txt.trim().length < minLength) return;
    setBusy(true);
    try { await onConfirm(txt.trim()); onOpenChange(false); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-2">
          <Label>Justificativa</Label>
          <Textarea
            value={txt}
            onChange={(e) => setTxt(e.target.value)}
            rows={4}
            placeholder="Descreva o motivo…"
          />
          <div className="text-xs text-muted-foreground">Mínimo {minLength} caracteres.</div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button variant={confirmVariant} onClick={submit} disabled={busy || txt.trim().length < minLength}>
            {busy ? 'Enviando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
