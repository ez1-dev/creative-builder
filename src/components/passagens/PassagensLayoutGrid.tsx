import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import GridLayout, { WidthProvider, type Layout, type LayoutItem } from 'react-grid-layout/legacy';
import { Minus, Plus, MoveHorizontal, MoveVertical, X, Settings, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PassagensWidget } from '@/hooks/usePassagensLayout';

const ResponsiveGrid = WidthProvider(GridLayout);

interface Props {
  widgets: PassagensWidget[];
  blocks: Record<string, ReactNode>;
  editing: boolean;
  onLayoutChange?: (next: { type: string; layout: { x: number; y: number; w: number; h: number } }[]) => void;
  onHide?: (type: string) => void;
  /** Callback para abrir o diálogo de configuração de um bloco. */
  onConfigure?: (type: string) => void;
  /** Tipos que podem ser configurados (mostram botão ⚙️). */
  configurableTypes?: string[];
  /** Callback para excluir permanentemente um bloco custom-*. */
  onDelete?: (type: string) => void;
}

const MIN_W = 3;
const MIN_H = 2;
const MAX_W = 12;

export function PassagensLayoutGrid({ widgets, blocks, editing, onLayoutChange, onHide, onConfigure, configurableTypes, onDelete }: Props) {
  const [isCompact, setIsCompact] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );
  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const orderedWidgets = useMemo(
    () =>
      [...widgets]
        .sort((a, b) => {
          // Ordena pela posição visual real (y, depois x). Empate: position.
          if (a.layout.y !== b.layout.y) return a.layout.y - b.layout.y;
          if (a.layout.x !== b.layout.x) return a.layout.x - b.layout.x;
          return a.position - b.position;
        })
        .filter((w) => blocks[w.type] && !w.hidden),
    [widgets, blocks],
  );

  // Estado local do layout para refletir cliques imediatamente nos botões +/-.
  const [localLayout, setLocalLayout] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});
  // Chave que reflete tanto o conjunto de widgets quanto a geometria salva.
  // Quando o backend devolve novas posições/tamanhos para os mesmos widgets
  // (ex.: link compartilhado abre o layout do admin), a chave muda e força
  // ressincronização do localLayout.
  const widgetTypesKey = orderedWidgets.map((w) => w.type).join('|');
  const widgetGeometryKey = orderedWidgets
    .map((w) => `${w.type}:${w.layout.x},${w.layout.y},${w.layout.w},${w.layout.h}`)
    .join('|');

  // Sincroniza quando o conjunto de widgets muda (entrou/saiu).
  // Em modo edição, preserva ajustes locais (drag/resize/botões +/-).
  useEffect(() => {
    setLocalLayout((prev) => {
      const next: typeof prev = {};
      orderedWidgets.forEach((w) => {
        next[w.type] = prev[w.type] ?? { x: w.layout.x, y: w.layout.y, w: w.layout.w, h: w.layout.h };
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetTypesKey]);

  // Fora do modo de edição (visualização normal e link compartilhado),
  // o layout vindo do banco é a fonte da verdade — sempre que ele mudar,
  // refletimos na renderização.
  const prevEditing = useRef(editing);
  useEffect(() => {
    const justExitedEditing = prevEditing.current && !editing;
    if (!editing || justExitedEditing) {
      const fresh: Record<string, { x: number; y: number; w: number; h: number }> = {};
      orderedWidgets.forEach((w) => {
        fresh[w.type] = { x: w.layout.x, y: w.layout.y, w: w.layout.w, h: w.layout.h };
      });
      setLocalLayout(fresh);
    }
    prevEditing.current = editing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, widgetGeometryKey]);

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
    // No modo de visualização, layout salvo é fonte única — não sobrescrever.
    if (!editing) return;
    // Apenas atualiza estado local (visual) durante drag/resize.
    // NÃO emite onLayoutChange aqui — evita avalanche de saves/re-renders.
    setLocalLayout((prev) => {
      let changed = false;
      const updated = { ...prev };
      next.forEach((l) => {
        const cur = prev[l.i];
        if (!cur || cur.x !== l.x || cur.y !== l.y || cur.w !== l.w || cur.h !== l.h) {
          updated[l.i] = { x: l.x, y: l.y, w: l.w, h: l.h };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  };

  // Commit final do gesto (drag/resize). Aqui sim emitimos para o pai.
  const handleStop = (next: Layout) => {
    setLocalLayout((prev) => {
      const updated = { ...prev };
      next.forEach((l) => {
        updated[l.i] = { x: l.x, y: l.y, w: l.w, h: l.h };
      });
      return updated;
    });
    lastEmitted.current = '';
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
      const layoutOut: Layout = orderedWidgets.map((wd) => {
        const l = updated[wd.type] ?? wd.layout;
        return { i: wd.type, x: l.x, y: l.y, w: l.w, h: l.h };
      });
      emit(layoutOut);
      return updated;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, type: string) => {
    if (!editing) return;
    // Só ativa quando o foco está no wrapper (evita disparar dentro de inputs/buttons internos).
    if (e.target !== e.currentTarget) return;
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const step = e.shiftKey ? 2 : 1;
    if (e.key === 'ArrowRight') stepResize(type, +step, 0);
    else if (e.key === 'ArrowLeft') stepResize(type, -step, 0);
    else if (e.key === 'ArrowDown') stepResize(type, 0, +step);
    else if (e.key === 'ArrowUp') stepResize(type, 0, -step);
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
      draggableHandle=".drag-handle"
      draggableCancel="button, a, input, select, textarea, [role='combobox'], [data-no-drag]"
      onLayoutChange={handleLayoutChange}
      onDragStop={handleStop}
      onResizeStop={handleStop}
    >
      {orderedWidgets.map((w) => {
        const cur = localLayout[w.type] ?? w.layout;
        return (
          <div
            key={w.type}
            role="group"
            aria-label={editing ? `${w.title}. Use as setas do teclado para redimensionar. Shift acelera.` : w.title}
            tabIndex={editing ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, w.type)}
            className={cn(
              'overflow-auto relative outline-none',
              editing && 'rounded-lg ring-2 ring-primary/40 ring-offset-2 ring-offset-background focus-visible:ring-primary pt-10',
            )}
          >
            {editing && (
              <div
                className="drag-handle absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded-md border bg-background/95 px-2 py-1 text-xs font-medium shadow-md backdrop-blur cursor-grab active:cursor-grabbing select-none max-w-[55%]"
                title="Arraste para mover este bloco"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{w.title}</span>
              </div>
            )}
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
                {onConfigure && (configurableTypes?.includes(w.type) || w.type.startsWith('custom-')) && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      title="Configurar gráfico (tipo, série e título)"
                      onClick={(e) => { e.stopPropagation(); onConfigure(w.type); }}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {onDelete && w.type.startsWith('custom-') && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    title="Excluir bloco permanentemente"
                    onClick={(e) => { e.stopPropagation(); onDelete(w.type); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onHide && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      title="Ocultar bloco do dashboard"
                      onClick={(e) => { e.stopPropagation(); onHide(w.type); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            )}
            {blocks[w.type]}
          </div>
        );
      })}
    </ResponsiveGrid>
  );
}
