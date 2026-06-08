import { type ReactNode } from 'react';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel,
  ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Filter, MousePointerClick, X, ChevronRight } from 'lucide-react';
import type { DrillType } from '@/lib/bi/comercialDrillApi';
import { DRILL_LABELS, NEXT_DRILLS, ENABLED_DRILLS } from '@/lib/bi/comercialDrillCatalog';

interface Props {
  children: ReactNode;
  /** Drill type associado ao gráfico (origem do clique direito). */
  drillType?: DrillType;
  /** Abrir o drawer de drill no tipo selecionado. */
  onOpenDrill: (next: DrillType) => void;
  /** Limpar todos os cross-filters da página. */
  onClearAll: () => void;
  /** Quantidade de filtros ativos (para mostrar/esconder “Limpar tudo”). */
  activeFiltersCount: number;
}

export function ChartContextMenu({
  children, drillType, onOpenDrill, onClearAll, activeFiltersCount,
}: Props) {
  const nextList: DrillType[] = drillType ? (NEXT_DRILLS[drillType] ?? []) : [];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="h-full w-full">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {drillType ? DRILL_LABELS[drillType] : 'Gráfico'}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem disabled className="text-xs gap-2">
          <MousePointerClick className="h-3.5 w-3.5" />
          Clique esquerdo: filtrar
        </ContextMenuItem>
        {nextList.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="text-xs gap-2">
              <Filter className="h-3.5 w-3.5" />
              Detalhar em…
              <ChevronRight className="h-3 w-3 ml-auto" />
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {nextList.map((dt) => (
                <ContextMenuItem
                  key={dt}
                  className="text-xs"
                  onSelect={(e) => { e.preventDefault(); onOpenDrill(dt); }}
                >
                  {DRILL_LABELS[dt]}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {activeFiltersCount > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-xs gap-2 text-destructive focus:text-destructive"
              onSelect={(e) => { e.preventDefault(); onClearAll(); }}
            >
              <X className="h-3.5 w-3.5" />
              Limpar todos os filtros ({activeFiltersCount})
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
