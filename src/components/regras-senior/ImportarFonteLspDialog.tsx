import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { RegraLSP } from '@/lib/senior/types';

export function ImportarFonteLspDialog({
  regra, onClose, onImported,
}: {
  regra: RegraLSP;
  onClose: () => void;
  onImported: () => void;
}) {
  const [nomeRegra, setNomeRegra] = useState(regra.nome_regra ?? '');
  const [fonteLsp, setFonteLsp] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const disabled = !fonteLsp.trim() || !motivo.trim() || !nomeRegra.trim() || saving;

  const submit = async () => {
    setSaving(true);
    try {
      await seniorApi.importarFonteRegra({
        codreg_erp: regra.codreg_erp ?? '',
        modsis: regra.modsis ?? '',
        idereg: regra.idereg ?? '',
        codtns: regra.codtns ?? '',
        nome_regra: nomeRegra.trim(),
        fonte_lsp: fonteLsp,
        motivo: motivo.trim(),
      });
      toast.success('Fonte LSP importada.');
      onImported();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao importar fonte LSP');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar fonte LSP</DialogTitle>
          <DialogDescription>
            Importe o fonte LSP da regra para o portal. Após a importação, o código ficará disponível para edição.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Código da regra</Label>
            <Input value={regra.codreg_erp ?? ''} readOnly disabled />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Módulo</Label>
            <Input value={regra.modsis ?? ''} readOnly disabled />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Identificador</Label>
            <Input value={regra.idereg ?? ''} readOnly disabled />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Transação</Label>
            <Input value={regra.codtns ?? ''} readOnly disabled />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Nome da regra</Label>
            <Input value={nomeRegra} onChange={(e) => setNomeRegra(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Fonte LSP</Label>
            <Textarea
              value={fonteLsp}
              onChange={(e) => setFonteLsp(e.target.value)}
              className="font-mono text-xs min-h-[320px]"
              placeholder="Cole aqui o fonte LSP da regra..."
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Motivo *</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={disabled}>
            {saving ? 'Importando…' : 'Importar fonte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
