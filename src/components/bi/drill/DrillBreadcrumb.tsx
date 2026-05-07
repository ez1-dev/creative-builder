import { ChevronRight, Home, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DrillBreadcrumbItem { levelKey: string; value: string; label: string }

export function DrillBreadcrumb({
  path, onJumpTo, onClear, rootLabel = 'Início',
}: { path: DrillBreadcrumbItem[]; onJumpTo: (depth: number) => void; onClear: () => void; rootLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
      <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs" onClick={() => onJumpTo(-1)}>
        <Home className="h-3 w-3" /> {rootLabel}
      </Button>
      {path.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => onJumpTo(i)}>
            <span className="text-muted-foreground">{p.label}:</span>&nbsp;<span className="font-medium">{p.value}</span>
          </Button>
        </span>
      ))}
      {path.length > 0 && (
        <Button size="sm" variant="ghost" className="ml-auto h-6 gap-1 px-2 text-xs" onClick={onClear}>
          <X className="h-3 w-3" /> Limpar
        </Button>
      )}
    </div>
  );
}
