import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { OperadorBadge, useOperadorInfo } from '@/components/requisicoes/OperadorBadge';

export interface ConfirmarBaixaItem {
  componente: string;
  descricao?: string | null;
  quantidade: number;
  unidade?: string | null;
  depositoSugerido?: number | string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opLabel: string;
  produtoFinal?: string | null;
  itens: ConfirmarBaixaItem[];
  onConfirm: () => Promise<void> | void;
  submitting?: boolean;
  timeoutMessage?: string | null;
}

/**
 * Confirmação obrigatória antes de qualquer movimento real de estoque no ERP.
 * Bloqueia duplo clique e destaca a natureza irreversível da operação.
 */
export function ConfirmarBaixaDialog({
  open, onOpenChange, opLabel, produtoFinal, itens, onConfirm, submitting, timeoutMessage,
}: Props) {
  const [busy, setBusy] = useState(false);
  const info = useOperadorInfo();
  const disabled = busy || submitting || !info.ready;

  const handleConfirm = async () => {
    if (disabled) return;
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!busy && !submitting) && onOpenChange(v)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirmar consumo de material</DialogTitle>
          <DialogDescription>
            Revise os dados abaixo — a baixa será registrada no ERP Senior no momento da confirmação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">OP</span>
              <span className="font-medium">{opLabel}</span>
            </div>
            {produtoFinal && (
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Produto final</span>
                <span className="font-mono text-xs">{produtoFinal}</span>
              </div>
            )}
          </div>

          <OperadorBadge compact />

          <div className="rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">Componente</th>
                  <th className="px-2 py-1.5 text-right">Qtd</th>
                  <th className="px-2 py-1.5 text-left">UM</th>
                  <th className="px-2 py-1.5 text-left">Dep. sugerido</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((it, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1.5">
                      <div className="font-mono">{it.componente}</div>
                      {it.descricao && <div className="text-muted-foreground">{it.descricao}</div>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{it.quantidade}</td>
                    <td className="px-2 py-1.5">{it.unidade ?? '—'}</td>
                    <td className="px-2 py-1.5">{it.depositoSugerido ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Movimento real de estoque</AlertTitle>
            <AlertDescription>
              Esta operação gera um movimento real de estoque no ERP Senior. A baixa
              não possui estorno automático nesta aplicação. Confirme somente quando
              o consumo realmente estiver ocorrendo.
            </AlertDescription>
          </Alert>

          {timeoutMessage && (
            <Alert>
              <AlertTitle>Comunicação instável</AlertTitle>
              <AlertDescription>{timeoutMessage}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy || submitting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={disabled}
            title={!info.ready ? info.motivo : undefined}
          >
            {(busy || submitting) && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirmar baixa no ERP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
