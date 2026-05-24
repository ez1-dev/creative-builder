import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, ChevronRight, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type KpiAccent = 'primary' | 'warn' | 'critical' | 'success' | 'muted';

const accentMap: Record<KpiAccent, string> = {
  primary: 'text-primary',
  warn: 'text-amber-600 dark:text-amber-500',
  critical: 'text-destructive',
  success: 'text-emerald-600 dark:text-emerald-500',
  muted: 'text-muted-foreground',
};

const accentRing: Record<KpiAccent, string> = {
  primary: 'bg-primary/10',
  warn: 'bg-amber-500/10',
  critical: 'bg-destructive/10',
  success: 'bg-emerald-500/10',
  muted: 'bg-muted',
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'primary',
  placeholder,
  badge,
  onDrill,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: KpiAccent;
  placeholder?: boolean;
  badge?: string;
  onDrill?: () => void;
}) {
  const clickable = !!onDrill && !placeholder;
  return (
    <Card
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onDrill : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onDrill?.();
        }
      }}
      className={cn(
        'p-3 md:p-4 rounded-2xl shadow-sm border bg-card relative overflow-hidden transition-all',
        clickable &&
          'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30',
      )}
    >
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <div className="min-w-0">
          <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-muted-foreground font-medium truncate">
            {label}
          </div>
          <div
            className={cn(
              'mt-1.5 md:mt-2 text-xl md:text-2xl font-bold tabular-nums',
              placeholder ? 'text-muted-foreground' : accentMap[accent],
            )}
          >
            {placeholder ? '—' : value}
          </div>
          {hint && <div className="mt-1 text-[10px] md:text-[11px] text-muted-foreground truncate">{hint}</div>}
        </div>
        <div
          className={cn(
            'h-8 w-8 md:h-9 md:w-9 rounded-xl flex items-center justify-center shrink-0',
            accentRing[accent],
          )}
        >
          <Icon className={cn('h-4 w-4', accentMap[accent])} />
        </div>
      </div>
      {clickable && !badge && (
        <ChevronRight className="absolute bottom-2 right-2 h-3.5 w-3.5 text-muted-foreground/60" />
      )}
      {badge && (
        <Badge variant="outline" className="absolute bottom-2 right-2 text-[10px] py-0">
          {badge}
        </Badge>
      )}
    </Card>
  );
}
