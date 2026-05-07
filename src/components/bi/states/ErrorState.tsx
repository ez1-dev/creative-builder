import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({
  title = 'Não foi possível carregar',
  message,
  onRetry,
  height = 200,
}: { title?: string; message?: string; onRetry?: () => void; height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center" style={{ minHeight: height }}>
      <AlertTriangle className="h-8 w-8 text-[hsl(var(--destructive))]" />
      <div className="text-sm font-medium text-foreground">{title}</div>
      {message && <div className="max-w-sm text-xs text-muted-foreground">{message}</div>}
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-2 gap-1">
          <RefreshCw className="h-3 w-3" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}
