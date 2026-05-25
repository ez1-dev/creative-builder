import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
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
}

export function KpiCard({
  title, value, format = 'raw', subtitle, icon, variant = 'default',
  trend, status, loading, tooltip, onClick, className,
}: KpiCardProps) {
  const clickable = !!onClick;
  const trendUp = trend ? trend.value > 0 : false;
  const trendDown = trend ? trend.value < 0 : false;

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
        </CardTitle>
        {icon && <span className="text-muted-foreground 3xl:[&>svg]:h-5 3xl:[&>svg]:w-5">{icon}</span>}
      </CardHeader>
      <CardContent className="space-y-1 3xl:space-y-2">
        {loading ? (
          <Skeleton className="h-7 3xl:h-10 w-24" />
        ) : (
          <div className="text-xl 3xl:text-3xl 4xl:text-4xl 5xl:text-5xl font-bold tabular-nums tracking-tight">{formatByKind(value as any, format)}</div>
        )}
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
