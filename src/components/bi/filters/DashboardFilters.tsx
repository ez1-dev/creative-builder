import { ReactNode, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Filter, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardFilters({
  children, onApply, onClear, onRefresh, defaultOpen = true, title = 'Filtros',
}: {
  children: ReactNode;
  onApply?: () => void;
  onClear?: () => void;
  onRefresh?: () => void;
  defaultOpen?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/60"
      >
        <span className="flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /> {title}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      <div className={cn('transition-all', open ? 'block' : 'hidden')}>
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{children}</div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/20 px-3 py-2">
          {onClear && <Button size="sm" variant="ghost" onClick={onClear}><X className="mr-1 h-3 w-3" />Limpar</Button>}
          {onRefresh && <Button size="sm" variant="outline" onClick={onRefresh}><RefreshCw className="mr-1 h-3 w-3" />Atualizar</Button>}
          {onApply && <Button size="sm" onClick={onApply}>Aplicar</Button>}
        </div>
      </div>
    </Card>
  );
}
