import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import GridLayout, { WidthProvider, type Layout, type LayoutItem } from 'react-grid-layout/legacy';
import { cn } from '@/lib/utils';
import type { PassagensWidget } from '@/hooks/usePassagensLayout';

const ResponsiveGrid = WidthProvider(GridLayout);

interface Props {
  widgets: PassagensWidget[];
  /** Map type -> ReactNode com o conteúdo do bloco. */
  blocks: Record<string, ReactNode>;
  /** Quando true, mostra handles de drag/resize. */
  editing: boolean;
  /** Chamado a cada mudança de layout durante a edição. */
  onLayoutChange?: (next: { type: string; layout: { x: number; y: number; w: number; h: number } }[]) => void;
}

/**
 * Renderiza os blocos do dashboard de Passagens Aéreas em uma grade
 * arrastável/redimensionável (admin) ou estática (demais usuários e link público).
 *
 * Em viewports < 1024px ignora completamente o layout customizado e empilha
 * os blocos verticalmente, na ordem de `position`, para preservar a
 * responsividade já existente nos sub-componentes.
 */
export function PassagensLayoutGrid({ widgets, blocks, editing, onLayoutChange }: Props) {
  const [isCompact, setIsCompact] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );
  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Garante ordem estável e evita widgets sem bloco renderizável.
  const orderedWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.position - b.position).filter((w) => blocks[w.type]),
    [widgets, blocks],
  );

  // Layout para o grid (1 entry por widget).
  const layoutItems: LayoutItem[] = useMemo(
    () =>
      orderedWidgets.map((w) => ({
        i: w.type,
        x: w.layout.x,
        y: w.layout.y,
        w: w.layout.w,
        h: w.layout.h,
        minW: 3,
        minH: 2,
      })),
    [orderedWidgets],
  );

  const lastEmitted = useRef<string>('');

  if (isCompact) {
    return (
      <div className="space-y-4">
        {orderedWidgets.map((w) => (
          <div key={w.type}>{blocks[w.type]}</div>
        ))}
      </div>
    );
  }

  const handleLayoutChange = (next: Layout[]) => {
    if (!editing || !onLayoutChange) return;
    const mapped = next.map((l) => ({
      type: l.i,
      layout: { x: l.x, y: l.y, w: l.w, h: l.h },
    }));
    const key = JSON.stringify(mapped);
    if (key === lastEmitted.current) return;
    lastEmitted.current = key;
    onLayoutChange(mapped);
  };

  return (
    <ResponsiveGrid
      className={cn('layout', editing && 'is-editing')}
      layout={layoutItems}
      cols={12}
      rowHeight={60}
      margin={[16, 16]}
      isDraggable={editing}
      isResizable={editing}
      compactType="vertical"
      preventCollision={false}
      draggableCancel="button, a, input, select, textarea, [role='combobox'], [data-no-drag]"
      onLayoutChange={handleLayoutChange}
    >
      {orderedWidgets.map((w) => (
        <div
          key={w.type}
          className={cn(
            'overflow-auto',
            editing && 'rounded-lg ring-2 ring-primary/40 ring-offset-2 ring-offset-background',
          )}
        >
          {blocks[w.type]}
        </div>
      ))}
    </ResponsiveGrid>
  );
}
