import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface FilterChipItem { key: string; label: string }

export function FilterChips({ chips, onRemove, onClearAll }: {
  chips: FilterChipItem[]; onRemove: (key: string) => void; onClearAll?: () => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-accent/40 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Filtros ativos:</span>
      {chips.map((c) => (
        <Badge key={c.key} variant="secondary" className="gap-1 pr-1">
          {c.label}
          <button onClick={() => onRemove(c.key)} className="ml-1 rounded-sm p-0.5 hover:bg-background/60" aria-label={`Remover ${c.label}`}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {onClearAll && <Button size="sm" variant="ghost" className="ml-auto h-6 px-2 text-xs" onClick={onClearAll}>Limpar todos</Button>}
    </div>
  );
}
