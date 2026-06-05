/**
 * Card vertical com 3 valores grandes empilhados (rótulo acima de cada valor).
 * Usado pelo bloco "Resumo Faturamento" (Realizado / Meta / Diferença).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatByKind, KpiFormat } from '../utils/formatters';

export interface TriStackItem {
  label: string;
  value: number | null | undefined;
  format?: KpiFormat;
  /** Cor opcional (CSS color) — sobrepõe a cor herdada do widget. */
  color?: string;
}

export interface KpiTriStackCardProps {
  title?: string;
  items: [TriStackItem, TriStackItem, TriStackItem];
  className?: string;
}

export function KpiTriStackCard({ title, items, className }: KpiTriStackCardProps) {
  return (
    <Card className={cn('h-full flex flex-col', className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-sm 3xl:text-base font-semibold">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 flex flex-col justify-around items-center gap-2 py-3">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col items-center leading-tight">
            <span className="text-[11px] 3xl:text-xs text-muted-foreground">{it.label}</span>
            <span
              data-widget-value
              className="text-xl 3xl:text-3xl 4xl:text-4xl font-bold tabular-nums tracking-tight"
              style={it.color ? { color: it.color } : undefined}
            >
              {formatByKind(it.value ?? 0, it.format ?? 'currency')}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
