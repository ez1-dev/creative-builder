import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { FilaAlmoxItem } from '@/types/requisicoes';

export type AcaoItem =
  | 'reservar' | 'separar' | 'atender' | 'transferir' | 'baixar' | 'falta' | 'compras';

const TITLE: Record<AcaoItem, string> = {
  reservar: 'Reservar item',
  separar: 'Separar item',
  atender: 'Atender (total ou parcial)',
  transferir: 'Transferir para depósito',
  baixar: 'Baixar componente na OP',
  falta: 'Registrar falta',
  compras: 'Encaminhar para compras',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  acao: AcaoItem;
  item: FilaAlmoxItem | null;
  onConfirm: (payload: Record<string, any>) => Promise<void> | void;
}

export function AcaoItemDialog({ open, onOpenChange, acao, item, onConfirm }: Props) {
  const [qtd, setQtd] = useState<string>('');
  const [lote, setLote] = useState<string>('');
  const [endereco, setEndereco] = useState<string>('');
  const [depDestino, setDepDestino] = useState<string>('');
  const [obs, setObs] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && item) {
      const sugestao = item.qtd_pendente ?? item.qtd_aprovada ?? item.qtd_solicitada ?? 0;
      setQtd(String(sugestao));
      setLote(item.lote ?? '');
      setEndereco(item.endereco ?? '');
      setDepDestino(item.deposito_destino != null ? String(item.deposito_destino) : '');
      setObs('');
      setBusy(false);
    }
  }, [open, item]);

  if (!item) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const payload: Record<string, any> = {
        quantidade: Number(qtd) || 0,
      };
      if (lote) payload.lote = lote;
      if (endereco) payload.endereco = endereco;
      if (acao === 'transferir' && depDestino) payload.deposito_destino = Number(depDestino);
      if (obs) payload.observacao = obs;
      await onConfirm(payload);
      onOpenChange(false);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TITLE[acao]}</DialogTitle>
          <DialogDescription>
            Requisição <span className="font-mono">{item.requisicao_numero}</span> · item {item.item_seq} · componente{' '}
            <span className="font-mono">{item.codcmp}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Quantidade</Label>
            <Input type="number" step="0.001" value={qtd} onChange={(e) => setQtd(e.target.value)} />
            <div className="mt-1 text-xs text-muted-foreground">
              Pendente informado pela API: {item.qtd_pendente}. Não recalculamos localmente.
            </div>
          </div>
          {(acao === 'reservar' || acao === 'separar' || acao === 'atender') && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Lote</Label>
                <Input value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
          )}
          {acao === 'transferir' && (
            <div>
              <Label>Depósito de destino</Label>
              <Input value={depDestino} onChange={(e) => setDepDestino(e.target.value)} placeholder="Ex.: 21" />
              <div className="mt-1 text-xs text-muted-foreground">
                A regra <code>900SDPBC01</code> no ERP pode ajustar o depósito final.
              </div>
            </div>
          )}
          <div>
            <Label>Observação</Label>
            <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || !qtd || Number(qtd) <= 0}>
            {busy ? 'Enviando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
