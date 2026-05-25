import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Modo Wallboard / TV.
 * Ativado via querystring `?tv=1`. Quando ativo:
 *   - marca <html data-tv="1"> (CSS esconde elementos com data-tv-hide e reforça focus)
 *   - retorna `tvMode = true` para componentes ajustarem layout/intervalos de refresh
 */
export function useTvMode(): { tvMode: boolean; refetchIntervalMs: number | false } {
  const location = useLocation();
  const tvMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('tv');
    return v === '1' || v === 'true';
  }, [location.search]);

  useEffect(() => {
    const el = document.documentElement;
    if (tvMode) {
      el.setAttribute('data-tv', '1');
    } else {
      el.removeAttribute('data-tv');
    }
    return () => {
      el.removeAttribute('data-tv');
    };
  }, [tvMode]);

  return {
    tvMode,
    refetchIntervalMs: tvMode ? 60_000 : false,
  };
}
