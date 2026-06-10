/**
 * InteractiveHeatLegend
 *
 * Barra vertical de calor com:
 * - hover: linha + tooltip do valor
 * - 2 handles arrastáveis para selecionar uma faixa [min, max]
 * - duplo clique reseta a faixa
 * - rótulos max/0 e (quando há faixa) texto "Faixa: X até Y" + ações
 */
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export interface InteractiveHeatLegendProps {
  min?: number;
  max: number;
  height: number;
  gradient: string;
  title?: string;
  titleExtras?: ReactNode;
  selectedRange: [number, number] | null;
  onRangeChange: (range: [number, number] | null) => void;
  onRangeApply?: () => void;
  formatValue: (v: number) => string;
  ufsInRange?: string[];
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function valueFromY(clientY: number, rect: DOMRect, max: number) {
  const y = clamp(clientY - rect.top, 0, rect.height);
  const ratio = 1 - y / rect.height;
  return clamp(ratio * max, 0, max);
}

function yPctFromValue(value: number, max: number) {
  if (!max || max <= 0) return 0;
  return clamp((1 - value / max) * 100, 0, 100);
}

type DragHandle = 'min' | 'max' | 'new' | null;

export function InteractiveHeatLegend({
  min = 0,
  max,
  height,
  gradient,
  title = 'Fat. (R$)',
  titleExtras,
  selectedRange,
  onRangeChange,
  onRangeApply,
  formatValue,
  ufsInRange = [],
}: InteractiveHeatLegendProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const dragRef = useRef<DragHandle>(null);
  const newStartRef = useRef<number | null>(null);

  const updateHover = useCallback(
    (clientY: number) => {
      const el = barRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const v = valueFromY(clientY, rect, max);
      setHoverValue(v);
      setHoverY(clamp(clientY - rect.top, 0, rect.height));
    },
    [max],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = barRef.current;
      if (!el || max <= 0) return;
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      const v = valueFromY(e.clientY, rect, max);
      if (selectedRange) {
        const [lo, hi] = selectedRange;
        // pega o handle mais próximo
        const dLo = Math.abs(v - lo);
        const dHi = Math.abs(v - hi);
        dragRef.current = dLo < dHi ? 'min' : 'max';
        const next: [number, number] = [...selectedRange] as [number, number];
        if (dragRef.current === 'min') next[0] = Math.min(v, hi);
        else next[1] = Math.max(v, lo);
        onRangeChange(next);
      } else {
        // inicia nova faixa a partir deste ponto
        dragRef.current = 'new';
        newStartRef.current = v;
        onRangeChange([v, v]);
      }
      updateHover(e.clientY);
    },
    [max, selectedRange, onRangeChange, updateHover],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      updateHover(e.clientY);
      if (!dragRef.current) return;
      const el = barRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const v = valueFromY(e.clientY, rect, max);
      if (dragRef.current === 'new' && newStartRef.current != null) {
        const start = newStartRef.current;
        onRangeChange([Math.min(start, v), Math.max(start, v)]);
      } else if (selectedRange) {
        const [lo, hi] = selectedRange;
        if (dragRef.current === 'min') {
          onRangeChange([Math.min(v, hi), hi]);
        } else if (dragRef.current === 'max') {
          onRangeChange([lo, Math.max(v, lo)]);
        }
      }
    },
    [max, selectedRange, onRangeChange, updateHover],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = barRef.current;
      if (el && el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      // se o usuário só clicou (faixa nula), limpa
      if (dragRef.current === 'new' && selectedRange && selectedRange[0] === selectedRange[1]) {
        onRangeChange(null);
      }
      dragRef.current = null;
      newStartRef.current = null;
    },
    [selectedRange, onRangeChange],
  );

  const handleDoubleClick = useCallback(() => {
    onRangeChange(null);
  }, [onRangeChange]);

  const minPct = selectedRange ? yPctFromValue(selectedRange[0], max) : 100;
  const maxPct = selectedRange ? yPctFromValue(selectedRange[1], max) : 0;

  const ufsLabel =
    ufsInRange.length === 0
      ? 'Nenhum estado na faixa'
      : ufsInRange.length <= 6
        ? `Estados na faixa: ${ufsInRange.join(', ')}`
        : `Estados na faixa: ${ufsInRange.length} UFs`;

  return (
    <div className="flex flex-col items-start gap-2 shrink-0" style={{ minWidth: 96 }}>
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-medium text-muted-foreground leading-tight">
          {title}
        </span>
        {titleExtras}
      </div>

      <div className="flex items-stretch gap-2" style={{ height }}>
        {/* Barra interativa */}
        <div
          ref={barRef}
          role="slider"
          aria-label="Faixa de faturamento"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={selectedRange ? selectedRange[1] : max}
          tabIndex={0}
          className="relative w-4 rounded-full border border-border touch-none select-none"
          style={{ background: gradient, cursor: 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={(e) => {
            setHoverValue(null);
            setHoverY(null);
            if (dragRef.current) endDrag(e);
          }}
          onDoubleClick={handleDoubleClick}
        >
          {/* Overlays fora da faixa */}
          {selectedRange && (
            <>
              <div
                className="absolute left-0 right-0 top-0 rounded-t-full"
                style={{
                  height: `${maxPct}%`,
                  background: 'hsl(var(--background) / 0.65)',
                  pointerEvents: 'none',
                }}
              />
              <div
                className="absolute left-0 right-0 bottom-0 rounded-b-full"
                style={{
                  height: `${100 - minPct}%`,
                  background: 'hsl(var(--background) / 0.65)',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}

          {/* Linha de hover */}
          {hoverY != null && (
            <div
              className="absolute left-[-4px] right-[-4px] h-px bg-foreground/70 pointer-events-none"
              style={{ top: hoverY }}
            />
          )}

          {/* Handles */}
          {selectedRange && (
            <>
              <div
                className="absolute -right-1 -translate-y-1/2 h-3 w-3 rounded-sm bg-foreground border border-background shadow"
                style={{ top: `${maxPct}%`, cursor: 'ns-resize', pointerEvents: 'none' }}
                aria-hidden
              />
              <div
                className="absolute -right-1 -translate-y-1/2 h-3 w-3 rounded-sm bg-foreground border border-background shadow"
                style={{ top: `${minPct}%`, cursor: 'ns-resize', pointerEvents: 'none' }}
                aria-hidden
              />
            </>
          )}

          {/* Tooltip de hover */}
          {hoverValue != null && hoverY != null && (
            <div
              className="absolute left-6 -translate-y-1/2 z-20 whitespace-nowrap rounded border border-border bg-popover px-1.5 py-0.5 text-[10px] font-medium text-popover-foreground shadow pointer-events-none tabular-nums"
              style={{ top: hoverY }}
            >
              {formatValue(hoverValue)}
            </div>
          )}
        </div>

        {/* Labels max/0 */}
        <div className="flex flex-col justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>{formatValue(max)}</span>
          <span>{formatValue(min)}</span>
        </div>
      </div>

      {/* Texto da faixa + ações */}
      {selectedRange && (
        <div className="flex flex-col gap-1 max-w-[180px]">
          <div className="text-[10px] text-muted-foreground leading-tight">
            <div className="font-medium text-foreground">Faixa</div>
            <div className="tabular-nums">
              {formatValue(selectedRange[0])} até {formatValue(selectedRange[1])}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight">{ufsLabel}</div>
          <div className="flex flex-wrap gap-1 pt-1">
            {onRangeApply && ufsInRange.length > 0 && (
              <Button
                size="sm"
                variant="default"
                className="h-6 px-2 text-[10px]"
                onClick={onRangeApply}
              >
                Aplicar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() => onRangeChange(null)}
            >
              Limpar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveHeatLegend;
