import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
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
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: KpiAccent;
  placeholder?: boolean;
  badge?: string;
}) {
  return (
    <Card className="p-4 rounded-2xl shadow-sm border bg-card relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className={cn('mt-2 text-2xl font-bold tabular-nums', placeholder ? 'text-muted-foreground' : accentMap[accent])}>
            {placeholder ? '—' : value}
          </div>
          {hint && (
            <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
          )}
        </div>
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', accentRing[accent])}>
          <Icon className={cn('h-4 w-4', accentMap[accent])} />
        </div>
      </div>
      {badge && (
        <Badge variant="outline" className="absolute bottom-2 right-2 text-[10px] py-0">{badge}</Badge>
      )}
    </Card>
  );
}
