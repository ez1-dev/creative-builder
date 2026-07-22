import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import type { EstoqueAnaliseItem } from '@/lib/estoque/analiseApi';
import { formatCobertura, classificarBadge } from '@/lib/estoque/analiseApi';

const dash = (v: any) => (v == null || v === '' ? '—' : v);
const fmtN = (v: any, d = 3) => (v == null || !Number.isFinite(Number(v)) ? '—' : formatNumber(Number(v), d));
const fmtM = (v: any) => (v == null || !Number.isFinite(Number(v)) ? '—' : `R$ ${formatNumber(Number(v), 2)}`);
const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

export function AnaliseItemDrawer({ item, onClose }: { item: EstoqueAnaliseItem | null; onClose: () => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                {dash(item.codpro)} · {dash(item.despro)}
              </DialogTitle>
              <DialogDescription>
                Derivação: {dash(item.desder ?? item.codder)} · Depósito: {dash(item.desdep ?? item.coddep)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div className="text-muted-foreground">Saldo físico</div><div className="text-right tabular-nums">{fmtN(item.saldo)}</div>
              <div className="text-muted-foreground">Custo médio</div><div className="text-right tabular-nums">{fmtM(item.custo_medio)}</div>
              <div className="text-muted-foreground">Valor em estoque</div><div className="text-right tabular-nums">{fmtM(item.valor_estoque)}</div>
              <div className="text-muted-foreground">Consumo (qtd)</div><div className="text-right tabular-nums">{fmtN(item.consumo_quantidade)}</div>
              <div className="text-muted-foreground">Consumo (valor)</div><div className="text-right tabular-nums">{fmtM(item.consumo_valor)}</div>
              <div className="text-muted-foreground">Última saída</div><div className="text-right">{fmtDate(item.ultima_saida)}</div>
              <div className="text-muted-foreground">Dias sem saída</div><div className="text-right tabular-nums">{item.dias_sem_saida ?? '—'}</div>
              <div className="text-muted-foreground">Giro</div><div className="text-right tabular-nums">{item.giro == null ? '—' : formatNumber(item.giro, 2)}</div>
              <div className="text-muted-foreground">Cobertura</div><div className="text-right">{formatCobertura(item.cobertura_meses ?? null)}</div>
              <div className="text-muted-foreground">Curva ABC</div><div className="text-right">{classificarBadge(item) === 'SEM_CONSUMO' ? 'Sem consumo' : classificarBadge(item)}</div>
              <div className="text-muted-foreground">% acumulado</div><div className="text-right tabular-nums">{item.abc_pct_acumulado == null ? '—' : `${formatNumber(item.abc_pct_acumulado, 2)}%`}</div>
              <div className="text-muted-foreground">Reservado em OP</div><div className="text-right tabular-nums">{fmtN(item.reservado)}</div>
              <div className="text-muted-foreground">Qtd OPs</div><div className="text-right tabular-nums">{item.ops_reservando ?? '—'}</div>
              <div className="text-muted-foreground">Disponível</div><div className="text-right tabular-nums">{fmtN(item.disponivel)}</div>
              <div className="text-muted-foreground">A receber</div><div className="text-right tabular-nums">{fmtN(item.a_receber)}</div>
              <div className="text-muted-foreground">Próxima entrega</div><div className="text-right">{fmtDate(item.proxima_entrega)}</div>
              <div className="text-muted-foreground">Projetado</div><div className="text-right tabular-nums">{fmtN(item.projetado)}</div>
            </div>
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
              <p><strong>Giro</strong>: relação entre consumo e estoque médio/atual conforme regra do backend.</p>
              <p><strong>Cobertura</strong>: quantidade estimada de meses atendidos pelo saldo no ritmo atual.</p>
              <p className="mt-1">Todos os indicadores são calculados pelo backend.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
