import { X } from 'lucide-react';

export interface ActiveChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface Props {
  chips: ActiveChip[];
  onClearAll?: () => void;
}

export function ActiveFilterChips({ chips, onClearAll }: Props) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filtros ativos:</span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          className="group inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] hover:border-destructive hover:text-destructive"
        >
          <span className="text-muted-foreground">{c.label}:</span>
          <span className="font-medium">{c.value}</span>
          <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
        </button>
      ))}
      {onClearAll && chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-auto text-[11px] text-muted-foreground hover:text-destructive"
        >
          Limpar todos
        </button>
      )}
    </div>
  );
}
