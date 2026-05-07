import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState({ message = 'Carregando...', height = 200, variant = 'spinner' }: {
  message?: string; height?: number; variant?: 'spinner' | 'skeleton';
}) {
  if (variant === 'skeleton') {
    return (
      <div className="space-y-2 p-2" style={{ minHeight: height }}>
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground" style={{ minHeight: height }}>
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-xs">{message}</span>
    </div>
  );
}
