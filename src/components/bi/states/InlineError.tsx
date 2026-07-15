import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
  /** altura mínima da área para não colapsar o card no grid. */
  minHeight?: number;
}

/**
 * Faixa discreta de erro — mantém o card no layout sem "sequestrar"
 * altura completa como o ErrorState clássico.
 */
export function InlineError({
  message = 'Falha ao carregar dados',
  onRetry,
  className,
  minHeight = 80,
}: InlineErrorProps) {
  return (
    <div
      className={cn('flex items-center justify-center', className)}
      style={{ minHeight }}
    >
      <div className="flex items-center gap-2 rounded-md border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-3 py-1.5 text-xs">
        <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
        <span className="text-foreground/80">{message}</span>
        {onRetry && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-2 text-[11px]"
            onClick={onRetry}
          >
            <RefreshCw className="h-3 w-3" /> Tentar
          </Button>
        )}
      </div>
    </div>
  );
}
