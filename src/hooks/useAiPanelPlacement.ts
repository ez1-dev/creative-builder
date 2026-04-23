import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAiAssistantPrefs, type AiPanelPosition } from '@/hooks/useAiAssistantPrefs';

const PANEL_W = 380;
const PANEL_H = 560;
const MARGIN = 16;
const SENSITIVE_SELECTORS = [
  '[data-ai-avoid]',
  'table',
  '[role="grid"]',
  '.recharts-wrapper',
  '.recharts-surface',
];

interface Quadrant {
  name: 'tl' | 'tr' | 'bl' | 'br';
  x: number;
  y: number;
}

function intersectionArea(a: DOMRect, b: { x: number; y: number; w: number; h: number }) {
  const left = Math.max(a.left, b.x);
  const right = Math.min(a.right, b.x + b.w);
  const top = Math.max(a.top, b.y);
  const bottom = Math.min(a.bottom, b.y + b.h);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

/**
 * Picks the screen quadrant with the least overlap over "sensitive" regions
 * (KPI cards, tables, charts). Falls back to bottom-right if everything is busy.
 */
function pickAutoPosition(): AiPanelPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(PANEL_W, vw - MARGIN * 2);
  const h = Math.min(PANEL_H, vh - MARGIN * 2);

  const quadrants: Quadrant[] = [
    { name: 'tl', x: MARGIN, y: MARGIN },
    { name: 'tr', x: vw - w - MARGIN, y: MARGIN },
    { name: 'bl', x: MARGIN, y: vh - h - MARGIN },
    { name: 'br', x: vw - w - MARGIN, y: vh - h - MARGIN },
  ];

  let nodes: Element[] = [];
  try {
    nodes = Array.from(document.querySelectorAll(SENSITIVE_SELECTORS.join(',')));
  } catch {
    nodes = [];
  }
  const rects = nodes
    .map((n) => n.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh);

  let best = quadrants[3]; // default br
  let bestOverlap = Infinity;
  for (const q of quadrants) {
    const box = { x: q.x, y: q.y, w, h };
    let overlap = 0;
    for (const r of rects) overlap += intersectionArea(r, box);
    if (overlap < bestOverlap) {
      bestOverlap = overlap;
      best = q;
    }
  }
  return { x: best.x, y: best.y, w, h };
}

export function useAiPanelPlacement(open: boolean) {
  const location = useLocation();
  const route = location.pathname;
  const isMobile = useIsMobile();
  const { prefs, setPanelPosition, resetPanelPositions } = useAiAssistantPrefs();
  const [position, setPositionState] = useState<AiPanelPosition | null>(null);

  const saved = prefs.panel_position_by_route[route];

  // Compute initial position when opened
  useEffect(() => {
    if (!open || isMobile) return;
    if (saved && saved.pinned) {
      setPositionState(saved);
      return;
    }
    if (saved) {
      // Honor last manual position even if not pinned
      setPositionState(clampToViewport(saved));
      return;
    }
    setPositionState(pickAutoPosition());
  }, [open, isMobile, route]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-clamp on window resize
  useEffect(() => {
    if (!open || isMobile) return;
    const onResize = () => {
      setPositionState((p) => (p ? clampToViewport(p) : pickAutoPosition()));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, isMobile]);

  const updatePosition = useCallback(
    (next: Partial<AiPanelPosition>) => {
      setPositionState((cur) => {
        const merged = clampToViewport({
          ...(cur || pickAutoPosition()),
          ...next,
        });
        // Persist as non-pinned manual position
        setPanelPosition(route, { ...merged, pinned: cur?.pinned ?? false });
        return merged;
      });
    },
    [route, setPanelPosition]
  );

  const togglePinned = useCallback(() => {
    setPositionState((cur) => {
      if (!cur) return cur;
      const next = { ...cur, pinned: !cur.pinned };
      setPanelPosition(route, next);
      return next;
    });
  }, [route, setPanelPosition]);

  const recompute = useCallback(() => {
    const p = pickAutoPosition();
    setPositionState(p);
    setPanelPosition(route, { ...p, pinned: false });
  }, [route, setPanelPosition]);

  return useMemo(
    () => ({
      isMobile,
      position,
      updatePosition,
      togglePinned,
      recompute,
      resetAll: resetPanelPositions,
      pinned: !!position?.pinned,
    }),
    [isMobile, position, updatePosition, togglePinned, recompute, resetPanelPositions]
  );
}

function clampToViewport(p: AiPanelPosition): AiPanelPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(Math.max(p.w || PANEL_W, 320), Math.max(320, vw - MARGIN * 2));
  const h = Math.min(Math.max(p.h || PANEL_H, 360), Math.max(360, vh - MARGIN * 2));
  const x = Math.min(Math.max(p.x, MARGIN), vw - w - MARGIN);
  const y = Math.min(Math.max(p.y, MARGIN), vh - h - MARGIN);
  return { x, y, w, h, pinned: p.pinned };
}
