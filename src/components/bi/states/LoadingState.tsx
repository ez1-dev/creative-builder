import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDelayedFlag } from '@/hooks/useDelayedFlag';
import { cn } from '@/lib/utils';

export type LoadingVariant = 'spinner' | 'skeleton' | 'bars' | 'line' | 'donut' | 'kpi';

export interface LoadingStateProps {
  message?: string;
  height?: number;
  variant?: LoadingVariant;
  /** Só mostra o skeleton após N ms; evita flash em respostas rápidas. */
  delayMs?: number;
}

export function LoadingState({
  message = 'Carregando...',
  height = 200,
  variant = 'spinner',
  delayMs = 200,
}: LoadingStateProps) {
  const show = useDelayedFlag(true, delayMs);

  // Placeholder invisível preservando espaço enquanto o delay não expira.
  if (!show) return <div style={{ minHeight: height }} aria-hidden />;

  if (variant === 'spinner') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground" style={{ minHeight: height }}>
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-xs">{message}</span>
      </div>
    );
  }

  if (variant === 'kpi') {
    return (
      <div className="space-y-2" style={{ minHeight: height }}>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-16 opacity-70" />
      </div>
    );
  }

  if (variant === 'bars') {
    const bars = [55, 78, 42, 90, 66, 34, 82, 58];
    return (
      <div className="flex items-end justify-between gap-2 p-2" style={{ minHeight: height }}>
        {bars.map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${(h / 100) * (height - 24)}px` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'line') {
    return (
      <div className="relative p-2" style={{ minHeight: height }}>
        <div className="absolute inset-x-2 top-2 flex flex-col justify-between" style={{ height: height - 24 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-px w-full opacity-40" />)}
        </div>
        <Skeleton className="absolute inset-x-4 rounded-full" style={{ top: height * 0.4, height: 3 }} />
      </div>
    );
  }

  if (variant === 'donut') {
    const size = Math.min(height - 24, 180);
    return (
      <div className="flex items-center justify-center" style={{ minHeight: height }}>
        <div className="relative" style={{ width: size, height: size }}>
          <Skeleton className="absolute inset-0 rounded-full" />
          <div
            className={cn('absolute rounded-full bg-card')}
            style={{ inset: size * 0.22 }}
          />
        </div>
      </div>
    );
  }

  // fallback genérico
  return (
    <div className="space-y-2 p-2" style={{ minHeight: height }}>
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
