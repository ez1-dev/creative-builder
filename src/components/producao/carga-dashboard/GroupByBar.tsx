import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, X, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { GROUP_FIELD_LABELS, type GroupField } from './useTableGrouping';

interface Props {
  value: GroupField[];
  onChange: (next: GroupField[]) => void;
  available?: GroupField[];
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

const DEFAULT_AVAILABLE: GroupField[] = ['unidade_negocio', 'tipo_recurso', 'codccu', 'codcre'];

export function GroupByBar({
  value,
  onChange,
  available = DEFAULT_AVAILABLE,
  onExpandAll,
  onCollapseAll,
}: Props) {
  const remaining = available.filter((f) => !value.includes(f));
  const grouping = value.length > 0;
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-muted/30">
      <span className="text-[11px] font-medium text-muted-foreground">Agrupar por:</span>
      {value.length === 0 && <span className="text-[11px] text-muted-foreground italic">sem agrupamento</span>}
      {value.map((f, i) => (
        <span
          key={f}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border text-[11px] font-medium"
        >
          <span className="text-muted-foreground">{i + 1}.</span>
          {GROUP_FIELD_LABELS[f]}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== f))}
            className="ml-0.5 text-muted-foreground hover:text-foreground"
            aria-label={`Remover ${GROUP_FIELD_LABELS[f]}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {remaining.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1">
              <Plus className="h-3 w-3" />
              adicionar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {remaining.map((f) => (
              <DropdownMenuItem key={f} className="text-xs" onClick={() => onChange([...value, f])}>
                {GROUP_FIELD_LABELS[f]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {grouping && (
        <div className="ml-auto flex items-center gap-1">
          {onExpandAll && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] gap-1" onClick={onExpandAll}>
              <ChevronsUpDown className="h-3 w-3" />
              Expandir
            </Button>
          )}
          {onCollapseAll && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] gap-1" onClick={onCollapseAll}>
              <ChevronsDownUp className="h-3 w-3" />
              Recolher
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
