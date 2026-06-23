import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { formatCurrency } from '@/components/bi';
import { cn } from '@/lib/utils';
import type { DreDinamicaLinha } from '@/lib/bi/dreDinamicaApi';

export interface DreDinamicaTableProps {
  data: DreDinamicaLinha[];
  onConfigurarLinha?: (linha: DreDinamicaLinha) => void;
}

export function DreDinamicaTable({ data, onConfigurarLinha }: DreDinamicaTableProps) {
  return (
    <div className="rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Linha</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground w-48">Realizado</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground w-32">Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.map((l, idx) => {
            const indent = Math.max(0, (l.nivel ?? 0) - 1) * 16;
            const isTotal = l.tipo_linha === 'TOTAL' || l.tipo_linha === 'AGRUPADORA' || l.tipo_linha === 'CALCULO';
            const isTitulo = l.tipo_linha === 'TITULO';
            const bold = l.flag_negrito || isTotal || isTitulo;
            const neg = Number(l.realizado) < 0;
            return (
              <tr
                key={`${l.codigo_linha}-${idx}`}
                className={cn(
                  'border-t hover:bg-muted/30',
                  isTotal && 'bg-muted/30',
                  isTitulo && 'bg-muted/20',
                )}
              >
                <td className="px-3 py-2">
                  <div style={{ paddingLeft: indent }} className={cn('flex items-center gap-2', bold && 'font-semibold')}>
                    <span className="text-[10px] uppercase text-muted-foreground/70 w-20 shrink-0">
                      {l.tipo_linha}
                    </span>
                    <span>{l.descricao}</span>
                  </div>
                </td>
                <td className={cn(
                  'px-3 py-2 text-right tabular-nums',
                  bold && 'font-semibold',
                  isTotal && (neg ? 'text-destructive' : 'text-foreground'),
                )}>
                  {isTitulo ? '' : formatCurrency(Number(l.realizado ?? 0))}
                </td>
                <td className="px-3 py-2 text-right">
                  {l.tipo_linha !== 'TITULO' && onConfigurarLinha && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => onConfigurarLinha(l)}
                    >
                      <Settings2 className="mr-1 h-3 w-3" />
                      Configurar
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
