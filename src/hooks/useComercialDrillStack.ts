import { useCallback, useMemo, useState } from 'react';
import type { DrillType, DrillContexto } from '@/lib/bi/comercialDrillApi';
import { mergeCtx } from '@/lib/bi/comercialDrillCatalog';

export interface DrillStackLevel {
  drill_type: DrillType;
  contexto: DrillContexto;
  page: number;
  addedFilter?: { key: keyof DrillContexto; value: string };
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

export interface PushOpts {
  /** Quando true (padrão), preserva chaves compatíveis do contexto atual. */
  mergeWithCurrent?: boolean;
}

/** Retorna a primeira chave adicionada/alterada entre prev e next. */
function diffAddedFilter(
  prev: DrillContexto,
  next: DrillContexto,
): { key: keyof DrillContexto; value: string } | undefined {
  const keys = Object.keys(next) as (keyof DrillContexto)[];
  for (const k of keys) {
    const nv = next[k];
    if (nv == null || String(nv).length === 0) continue;
    const pv = prev?.[k];
    if (pv == null || String(pv) !== String(nv)) {
      return { key: k, value: String(nv) };
    }
  }
  return undefined;
}

export function useComercialDrillStack() {
  const [s, setS] = useState<InternalState>(INITIAL);

  const openWith = useCallback((init: OpenInitial) => {
    const ctx = mergeCtx({}, init.contexto || {}, init.drill_type, { keepAll: true });
    const added = diffAddedFilter({}, ctx);
    setS({
      open: true,
      selectorOpen: false,
      levels: [{
        drill_type: init.drill_type,
        contexto: ctx,
        page: 1,
        addedFilter: added,
      }],
    });
  }, []);

  const pushDrill = useCallback(
    (next: DrillType, rowFilters: DrillContexto = {}, opts: PushOpts = {}) => {
      const keepAll = opts.mergeWithCurrent !== false; // default true
      setS((prev) => {
        const cur = prev.levels[prev.levels.length - 1];
        const newCtx = mergeCtx(cur?.contexto || {}, rowFilters, next, { keepAll });
        const added = diffAddedFilter(cur?.contexto || {}, newCtx);
        return {
          ...prev,
          selectorOpen: false,
          levels: [...prev.levels, { drill_type: next, contexto: newCtx, page: 1, addedFilter: added }],
        };
      });
    },
    [],
  );

  /** Limpa stack e começa novo caminho com somente os filtros informados. */
  const replacePath = useCallback((next: DrillType, rowFilters: DrillContexto = {}) => {
    const ctx = mergeCtx({}, rowFilters, next, { keepAll: true });
    const added = diffAddedFilter({}, ctx);
    setS({
      open: true,
      selectorOpen: false,
      levels: [{
        drill_type: next,
        contexto: ctx,
        page: 1,
        addedFilter: added,
      }],
    });
  }, []);


  /** Remove uma chave do contexto do nível atual. */
  const removeContextKey = useCallback((key: keyof DrillContexto) => {
    setS((prev) => {
      if (prev.levels.length === 0) return prev;
      const last = prev.levels[prev.levels.length - 1];
      const newCtx = { ...last.contexto };
      delete (newCtx as any)[key];
      return {
        ...prev,
        levels: [
          ...prev.levels.slice(0, -1),
          { ...last, contexto: newCtx, page: 1 },
        ],
      };
    });
  }, []);

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
      replacePath,
      removeContextKey,
      pop,
      goTo,
      close,
      setOpen,
      setPage,
      toggleSelector,
    }),
    [s, current, openWith, pushDrill, replacePath, removeContextKey, pop, goTo, close, setOpen, setPage, toggleSelector],
  );
}

export type ComercialDrillStack = ReturnType<typeof useComercialDrillStack>;
