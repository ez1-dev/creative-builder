import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import GridLayout, { WidthProvider, type Layout, type LayoutItem } from 'react-grid-layout/legacy';
import { Minus, Plus, MoveHorizontal, MoveVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PassagensWidget } from '@/hooks/usePassagensLayout';

const ResponsiveGrid = WidthProvider(GridLayout);

interface Props {
  widgets: PassagensWidget[];
  blocks: Record<string, ReactNode>;
  editing: boolean;
  onLayoutChange?: (next: { type: string; layout: { x: number; y: number; w: number; h: number } }[]) => void;
}

const MIN_W = 3;
const MIN_H = 2;
const MAX_W = 12;

export function PassagensLayoutGrid({ widgets, blocks, editing, onLayoutChange }: Props) {
  const [isCompact, setIsCompact] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );
  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const orderedWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.position - b.position).filter((w) => blocks[w.type]),
    [widgets, blocks],
  );

  // Estado local do layout para refletir cliques imediatamente nos botões +/-.
  const [localLayout, setLocalLayout] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});
  useEffect(() => {
    const next: typeof localLayout = {};
    orderedWidgets.forEach((w) => {
      next[w.type] = { x: w.layout.x, y: w.layout.y, w: w.layout.w, h: w.layout.h };
    });
    setLocalLayout(next);
  }, [orderedWidgets]);

  const layoutItems: LayoutItem[] = useMemo(
    () =>
      orderedWidgets.map((w) => {
        const cur = localLayout[w.type] ?? w.layout;
        return { i: w.type, x: cur.x, y: cur.y, w: cur.w, h: cur.h, minW: MIN_W, minH: MIN_H };
      }),
    [orderedWidgets, localLayout],
  );

  const lastEmitted = useRef<string>('');

  const emit = (next: Layout) => {
    if (!editing || !onLayoutChange) return;
    const mapped = next.map((l) => ({ type: l.i, layout: { x: l.x, y: l.y, w: l.w, h: l.h } }));
    const key = JSON.stringify(mapped);
    if (key === lastEmitted.current) return;
    lastEmitted.current = key;
    onLayoutChange(mapped);
  };

  if (isCompact) {
    return (
      <div className="space-y-4">
        {orderedWidgets.map((w) => (
          <div key={w.type}>{blocks[w.type]}</div>
        ))}
      </div>
    );
  }

  const handleLayoutChange = (next: Layout) => {
    // Sincroniza estado local a partir do grid (drag/resize por arrasto).
    setLocalLayout((prev) => {
      const updated = { ...prev };
      next.forEach((l) => {
        updated[l.i] = { x: l.x, y: l.y, w: l.w, h: l.h };
      });
      return updated;
    });
    emit(next);
  };

  const stepResize = (type: string, dW: number, dH: number) => {
    setLocalLayout((prev) => {
      const cur = prev[type];
      if (!cur) return prev;
      const w = Math.max(MIN_W, Math.min(MAX_W, cur.w + dW));
      const h = Math.max(MIN_H, cur.h + dH);
      if (w === cur.w && h === cur.h) return prev;
      const updated = { ...prev, [type]: { ...cur, w, h } };
      // Emite para o pai usando o estado atualizado.
      const layoutOut: Layout = orderedWidgets.map((wd) => {
        const l = updated[wd.type] ?? wd.layout;
        return { i: wd.type, x: l.x, y: l.y, w: l.w, h: l.h };
      });
      emit(layoutOut);
      return updated;
    });
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
      {orderedWidgets.map((w) => {
        const cur = localLayout[w.type] ?? w.layout;
        return (
          <div
            key={w.type}
            className={cn(
              'overflow-auto relative',
              editing && 'rounded-lg ring-2 ring-primary/40 ring-offset-2 ring-offset-background',
            )}
          >
            {editing && (
              <div
                data-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md border bg-background/95 p-1 shadow-md backdrop-blur"
              >
                <div className="flex items-center gap-0.5" title="Largura">
                  <MoveHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Diminuir largura"
                    disabled={cur.w <= MIN_W}
                    onClick={(e) => { e.stopPropagation(); stepResize(w.type, -1, 0); }}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Aumentar largura"
                    disabled={cur.w >= MAX_W}
                    onClick={(e) => { e.stopPropagation(); stepResize(w.type, +1, 0); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-0.5" title="Altura">
                  <MoveVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Diminuir altura"
                    disabled={cur.h <= MIN_H}
                    onClick={(e) => { e.stopPropagation(); stepResize(w.type, 0, -1); }}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Aumentar altura"
                    onClick={(e) => { e.stopPropagation(); stepResize(w.type, 0, +1); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            {blocks[w.type]}
          </div>
        );
      })}
    </ResponsiveGrid>
  );
}
