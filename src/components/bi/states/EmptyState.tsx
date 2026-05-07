import { Inbox } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export function EmptyState({
  title = 'Sem dados',
  description = 'Nenhum registro encontrado para os filtros aplicados.',
  icon,
  action,
  height = 200,
}: { title?: string; description?: string; icon?: ReactNode; action?: { label: string; onClick: () => void }; height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground" style={{ minHeight: height }}>
      <div className="opacity-60">{icon ?? <Inbox className="h-8 w-8" />}</div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="max-w-sm text-xs">{description}</div>
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick} className="mt-2">{action.label}</Button>
      )}
    </div>
  );
}
