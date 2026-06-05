import { useCallback, useMemo, useState } from 'react';
import type { DrillType, DrillContexto } from '@/lib/bi/comercialDrillApi';

export interface DrillStackLevel {
  drill_type: DrillType;
  contexto: DrillContexto;
  page: number;
}

interface InternalState {
  open: boolean;
  levels: DrillStackLevel[];
  selectorOpen: boolean;
}

const INITIAL: InternalState = { open: false, levels: [], selectorOpen: false };

export interface OpenInitial {
  drill_type: DrillType;
  contexto?: DrillContexto;
}

export function useComercialDrillStack() {
  const [s, setS] = useState<InternalState>(INITIAL);

  const openWith = useCallback((init: OpenInitial) => {
    setS({
      open: true,
      selectorOpen: false,
      levels: [{ drill_type: init.drill_type, contexto: { ...(init.contexto || {}) }, page: 1 }],
    });
  }, []);

  const pushDrill = useCallback(
    (next: DrillType, ctxFromRow: DrillContexto = {}) => {
      setS((prev) => {
        const cur = prev.levels[prev.levels.length - 1];
        const mergedCtx = { ...(cur?.contexto || {}), ...ctxFromRow };
        return {
          ...prev,
          selectorOpen: false,
          levels: [...prev.levels, { drill_type: next, contexto: mergedCtx, page: 1 }],
        };
      });
    },
    [],
  );

  const pop = useCallback(() => {
    setS((prev) => {
      if (prev.levels.length <= 1) return { ...INITIAL };
      return { ...prev, levels: prev.levels.slice(0, -1), selectorOpen: false };
    });
  }, []);

  const goTo = useCallback((index: number) => {
    setS((prev) => ({
      ...prev,
      selectorOpen: false,
      levels: prev.levels.slice(0, Math.max(1, index + 1)),
    }));
  }, []);

  const close = useCallback(() => setS({ ...INITIAL }), []);

  const setOpen = useCallback((o: boolean) => {
    if (!o) setS({ ...INITIAL });
    else setS((prev) => ({ ...prev, open: true }));
  }, []);

  const setPage = useCallback((p: number) => {
    setS((prev) => {
      if (prev.levels.length === 0) return prev;
      const last = { ...prev.levels[prev.levels.length - 1], page: Math.max(1, p) };
      return { ...prev, levels: [...prev.levels.slice(0, -1), last] };
    });
  }, []);

  const toggleSelector = useCallback(
    () => setS((prev) => ({ ...prev, selectorOpen: !prev.selectorOpen })),
    [],
  );

  const current = s.levels[s.levels.length - 1];

  return useMemo(
    () => ({
      open: s.open,
      levels: s.levels,
      current,
      selectorOpen: s.selectorOpen,
      openWith,
      pushDrill,
      pop,
      goTo,
      close,
      setOpen,
      setPage,
      toggleSelector,
    }),
    [s, current, openWith, pushDrill, pop, goTo, close, setOpen, setPage, toggleSelector],
  );
}

export type ComercialDrillStack = ReturnType<typeof useComercialDrillStack>;
