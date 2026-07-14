import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building2, BookOpen, FileText, Receipt, Landmark, Search } from 'lucide-react';
import {
  DRILL_LABELS,
  normalizarDrillDimensao,
  type DrillDimensao,
} from '@/lib/contabil/drillDreApi';

const ICONS: Record<DrillDimensao, React.ComponentType<{ className?: string }>> = {
  centro_custo: Building2,
  conta_contabil: BookOpen,
  historico: FileText,
  lancamento: Receipt,
  unidade_negocio: Landmark,
};

interface Props {
  drills: string[];
  onSelect: (d: DrillDimensao) => void;
  disabled?: boolean;
}

export function DrillMenu({ drills, onSelect, disabled }: Props) {
  const dims = Array.from(
    new Set(
      (drills ?? [])
        .map(normalizarDrillDimensao)
        .filter((d): d is DrillDimensao => d !== null),
    ),
  );
  if (dims.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Abrir menu de drill"
          title="Drill-down"
        >
          <Search className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          Lista de Drills
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {dims.map((d) => {
          const Icon = ICONS[d];
          return (
            <DropdownMenuItem
              key={d}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(d);
              }}
              className="gap-2 text-sm"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {DRILL_LABELS[d]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
