import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, ChevronRight, Info, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
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

export interface KpiDelta {
  /** Variação numérica. Positivo = subiu, negativo = desceu. */
  value: number;
  /** Unidade do delta. 'pct' = %, 'pp' = pontos percentuais, 'abs' = absoluto. */
  unit?: 'pct' | 'pp' | 'abs';
  /** Quando true, valores maiores são piores (ex.: erros). */
  invertColor?: boolean;
  /** Texto comparativo. Padrão: 'vs mês anterior'. */
  label?: string;
}

function DeltaIndicator({ delta }: { delta: KpiDelta }) {
  const { value, unit = 'pct', invertColor = false, label = 'vs mês anterior' } = delta;
  const isZero = value === 0 || !isFinite(value);
  const isUp = value > 0;
  const goodUp = !invertColor;
  const positive = isZero ? null : isUp === goodUp;
  const Icon = isZero ? Minus : isUp ? ArrowUpRight : ArrowDownRight;
  const color = isZero
    ? 'text-muted-foreground'
    : positive
      ? 'text-emerald-600 dark:text-emerald-500'
      : 'text-destructive';
  const abs = Math.abs(value);
  const formatted =
    unit === 'pct'
      ? `${abs.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
      : unit === 'pp'
        ? `${abs.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`
        : abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  return (
    <div className={cn('mt-1 flex items-center gap-1 text-[10px] md:text-[11px] font-medium', color)}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="tabular-nums">{isZero ? 'estável' : formatted}</span>
      <span className="text-muted-foreground font-normal truncate">{label}</span>
    </div>
  );
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'primary',
  placeholder,
  badge,
  onDrill,
  tooltip,
  delta,
  number,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: KpiAccent;
  placeholder?: boolean;
  badge?: string;
  onDrill?: () => void;
  tooltip?: string;
  delta?: KpiDelta;
  /** Número do card (ex.: 1, 2, …) renderizado discretamente no canto. */
  number?: number;
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
      {number !== undefined && (
        <span className="absolute top-2 left-2 text-[9px] md:text-[10px] font-semibold text-muted-foreground/50 tabular-nums">
          {number.toString().padStart(2, '0')}
        </span>
      )}
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <div className="min-w-0">
          <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-muted-foreground font-medium truncate flex items-center gap-1">
            <span className="truncate">{label}</span>
            {tooltip && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-muted-foreground/70 hover:text-foreground"
                      aria-label="Mais informações"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div
            className={cn(
              'mt-1.5 md:mt-2 text-xl md:text-2xl font-bold tabular-nums',
              placeholder ? 'text-muted-foreground' : accentMap[accent],
            )}
          >
            {placeholder ? '—' : value}
          </div>
          {delta && !placeholder && <DeltaIndicator delta={delta} />}
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
