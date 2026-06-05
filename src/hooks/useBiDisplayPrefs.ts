import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { NumberRoundingMode } from '@/lib/bi/numberFormatMode';

/**
 * Preferências de exibição do BI por usuário, persistidas em
 * `user_preferences.bi_display_prefs` (JSONB).
 *
 * - `global`: padrão aplicado a todas as páginas BI.
 * - `pages[pageKey]`: override por página (ex.: `'bi-comercial'`).
 *   Se ausente ou `null`, herda o `global`.
 */
export interface BiDisplayPrefs {
  numberRounding: {
    global: NumberRoundingMode;
    pages: Record<string, NumberRoundingMode>;
  };
}

const DEFAULT_PREFS: BiDisplayPrefs = {
  numberRounding: { global: 'full', pages: {} },
};

function mergePrefs(remote: any): BiDisplayPrefs {
  const r = (remote ?? {}) as Partial<BiDisplayPrefs>;
  const nr = (r.numberRounding ?? {}) as Partial<BiDisplayPrefs['numberRounding']>;
  return {
    numberRounding: {
      global: (nr.global as NumberRoundingMode) ?? 'full',
      pages: (nr.pages ?? {}) as Record<string, NumberRoundingMode>,
    },
  };
}

export function useBiDisplayPrefs() {
  const [prefs, setPrefs] = useState<BiDisplayPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPrefs(DEFAULT_PREFS);
        return;
      }
      userIdRef.current = user.id;
      const { data } = await supabase
        .from('user_preferences')
        .select('bi_display_prefs')
        .eq('user_id', user.id)
        .maybeSingle();
      setPrefs(mergePrefs((data as any)?.bi_display_prefs));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const persist = useCallback(async (next: BiDisplayPrefs) => {
    setPrefs(next);
    const uid = userIdRef.current;
    if (!uid) return;
    try {
      await supabase
        .from('user_preferences')
        .upsert({ user_id: uid, bi_display_prefs: next as any }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('[useBiDisplayPrefs] persist failed', e);
    }
  }, []);

  const setGlobalRounding = useCallback(
    (mode: NumberRoundingMode) => persist({
      ...prefs,
      numberRounding: { ...prefs.numberRounding, global: mode },
    }),
    [prefs, persist],
  );

  const setPageRounding = useCallback(
    (pageKey: string, mode: NumberRoundingMode | null) => {
      const pages = { ...prefs.numberRounding.pages };
      if (mode === null) delete pages[pageKey];
      else pages[pageKey] = mode;
      return persist({ ...prefs, numberRounding: { ...prefs.numberRounding, pages } });
    },
    [prefs, persist],
  );

  /** Modo efetivo para uma página específica (override → global → 'full'). */
  const effectiveRoundingFor = useCallback(
    (pageKey?: string): NumberRoundingMode => {
      if (pageKey && prefs.numberRounding.pages[pageKey]) {
        return prefs.numberRounding.pages[pageKey];
      }
      return prefs.numberRounding.global;
    },
    [prefs],
  );

  return {
    prefs,
    loading,
    reload,
    setGlobalRounding,
    setPageRounding,
    effectiveRoundingFor,
  };
}
