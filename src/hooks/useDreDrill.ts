import { useCallback, useState } from 'react';
import type { DreDrillParams, DreDrillTipo } from '@/lib/bi/dreDrillApi';

export interface DreDrillLevel extends DreDrillParams {}

export function useDreDrill() {
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState<DreDrillLevel[]>([]);

  const openWith = useCallback((params: DreDrillParams) => {
    setStack([params]);
    setOpen(true);
  }, []);

  const push = useCallback((next: DreDrillLevel) => {
    setStack((s) => [...s, next]);
  }, []);

  const pop = useCallback(() => {
    setStack((s) => (s.length <= 1 ? [] : s.slice(0, -1)));
    setOpen((o) => (stack.length <= 1 ? false : o));
  }, [stack.length]);

  const goTo = useCallback((idx: number) => {
    setStack((s) => s.slice(0, Math.max(1, idx + 1)));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setStack([]);
  }, []);

  const setOpenSafe = useCallback((o: boolean) => {
    if (o) setOpen(true);
    else close();
  }, [close]);

  const changeTipo = useCallback((tipo: DreDrillTipo) => {
    setStack((s) => {
      if (s.length === 0) return s;
      const last = { ...s[s.length - 1], tipo_drill: tipo };
      return [...s.slice(0, -1), last];
    });
  }, []);

  return { open, stack, openWith, push, pop, goTo, close, setOpen: setOpenSafe, changeTipo };
}

export type DreDrillState = ReturnType<typeof useDreDrill>;
