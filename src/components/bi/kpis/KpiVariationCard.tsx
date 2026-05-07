import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPercent } from '../utils/formatters';

export function KpiVariationCard({
  title, variation, subtitle,
}: { title: string; variation: number; subtitle?: string }) {
  const up = variation > 0, down = variation < 0;
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{title}</div>
          {subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
        <div className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold tabular-nums',
          up && 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
          down && 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]',
          !up && !down && 'bg-muted text-muted-foreground',
        )}>
          {up ? <TrendingUp className="h-4 w-4" /> : down ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          {formatPercent(Math.abs(variation), 1)}
        </div>
      </CardContent>
    </Card>
  );
}
