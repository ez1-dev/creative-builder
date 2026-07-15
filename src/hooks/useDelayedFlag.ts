import { useEffect, useState } from 'react';

/**
 * Retorna `true` apenas se `active` permanecer verdadeiro por `delayMs`.
 * Evita flash de skeletons em respostas rápidas (cache-hit, refetch).
 */
export function useDelayedFlag(active: boolean, delayMs = 200): boolean {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    if (!active) {
      setFlag(false);
      return;
    }
    const t = window.setTimeout(() => setFlag(true), delayMs);
    return () => window.clearTimeout(t);
  }, [active, delayMs]);
  return flag;
}
