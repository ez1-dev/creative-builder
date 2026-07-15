import { ReactNode, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDelayedFlag } from '@/hooks/useDelayedFlag';
import { cn } from '@/lib/utils';
import { formatByKind, KpiFormat, formatPercent } from '../utils/formatters';
import { StatusBadge, BiStatus } from '../badges/StatusBadge';

export type KpiVariant = 'default' | 'info' | 'success' | 'warning' | 'danger';

const VARIANT_CLS: Record<KpiVariant, string> = {
  default: 'border-border',
  info:    'border-l-4 border-l-[hsl(var(--info,215_70%_45%))]',
  success: 'border-l-4 border-l-[hsl(var(--success))]',
  warning: 'border-l-4 border-l-[hsl(var(--warning))]',
  danger:  'border-l-4 border-l-[hsl(var(--destructive))]',
};

export interface KpiCardProps {
  title: string;
  value: number | string | null | undefined;
  format?: KpiFormat;
  subtitle?: string;
  icon?: ReactNode;
  variant?: KpiVariant;
  trend?: { value: number; label?: string };
  status?: BiStatus;
  loading?: boolean;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
  /** Sinaliza que o payload da API veio parcial — mostra badge de aviso. */
  partial?: boolean;
  /** Mensagem de erro compacta — substitui o valor sem colapsar o card. */
  error?: string | null;
  /** Handler do botão "Tentar" no estado de erro. */
  onRetry?: () => void;
}

export function KpiCard({
  title, value, format = 'raw', subtitle, icon, variant = 'default',
  trend, status, loading, tooltip, onClick, className, partial, error, onRetry,
}: KpiCardProps) {
  const clickable = !!onClick;
  const trendUp = trend ? trend.value > 0 : false;
  const trendDown = trend ? trend.value < 0 : false;

  // Delay para evitar flash de skeleton em cache-hits rápidos.
  const showSkeleton = useDelayedFlag(!!loading, 200);
  // Mantém o último valor válido para reexibir enquanto refetch (stale-while-revalidate).
  const lastValueRef = useRef<number | string | null | undefined>(value);
  useEffect(() => {
    if (!loading && value != null && value !== '') lastValueRef.current = value;
  }, [loading, value]);
  const staleValue = lastValueRef.current;
  const hasStale = staleValue != null && staleValue !== '';

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        VARIANT_CLS[variant],
        clickable && 'cursor-pointer hover:-translate-y-0.5',
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 3xl:pb-3">
        <CardTitle className="flex items-center gap-1.5 text-xs 3xl:text-sm 4xl:text-base font-medium text-muted-foreground">
          {title}
          {tooltip && (
            <TooltipProvider><UITooltip>
              <TooltipTrigger asChild><Info className="h-3 w-3 3xl:h-4 3xl:w-4 opacity-60" /></TooltipTrigger>
              <TooltipContent><p className="max-w-xs text-xs">{tooltip}</p></TooltipContent>
            </UITooltip></TooltipProvider>
          )}
          {partial && (
            <TooltipProvider><UITooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-3 w-3 3xl:h-4 3xl:w-4 text-[hsl(var(--warning))]" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">Alguns campos vieram incompletos da API — exibindo o que foi reconhecido.</p>
              </TooltipContent>
            </UITooltip></TooltipProvider>
          )}
        </CardTitle>
        {icon && <span className="text-muted-foreground 3xl:[&>svg]:h-5 3xl:[&>svg]:w-5">{icon}</span>}
      </CardHeader>
      <CardContent className="space-y-1 3xl:space-y-2">
        {loading ? (
          <Skeleton className="h-7 3xl:h-10 w-24" />
        ) : (() => {
          const isNumericFmt = format === 'currency' || format === 'number' || format === 'quantity';
          const numeric = typeof value === 'number' ? value : null;
          const invalid = numeric !== null && !Number.isFinite(numeric);
          const negative = !invalid && isNumericFmt && numeric !== null && numeric < 0;
          const shownValue = invalid ? '—' : negative ? Math.abs(numeric as number) : (value as any);
          return (
            <div
              data-widget-value
              className={cn(
                'text-xl 3xl:text-3xl 4xl:text-4xl 5xl:text-5xl font-bold tabular-nums tracking-tight',
                negative && 'text-[hsl(var(--destructive))]',
                invalid && 'text-muted-foreground',
              )}
            >
              {invalid ? '—' : formatByKind(shownValue, format)}
            </div>
          );
        })()}
        {(subtitle || trend || status) && (
          <div className="flex items-center justify-between gap-2">
            {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
            <div className="ml-auto flex items-center gap-1.5">
              {status && <StatusBadge status={status} className="h-4 px-1.5 text-[10px]" />}
              {trend && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-[11px] font-medium tabular-nums',
                    trendUp && 'text-[hsl(var(--success))]',
                    trendDown && 'text-[hsl(var(--destructive))]',
                    !trendUp && !trendDown && 'text-muted-foreground',
                  )}
                >
                  {trendUp ? <TrendingUp className="h-3 w-3" /> : trendDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {formatPercent(Math.abs(trend.value), 1)}
                  {trend.label && <span className="text-muted-foreground">· {trend.label}</span>}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
