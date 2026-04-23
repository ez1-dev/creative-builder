import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AiPanelPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  pinned?: boolean;
}

export interface AiAssistantPrefs {
  auto_open_enabled: boolean;
  panel_position_by_route: Record<string, AiPanelPosition>;
  // Reserved for future cross-device persistence
  snoozed_routes?: Record<string, number>;
  last_auto_open_dates?: Record<string, string>;
}

const DEFAULT_PREFS: AiAssistantPrefs = {
  auto_open_enabled: true,
  panel_position_by_route: {},
};

/**
 * Loads and updates the user's AI assistant preferences (auto-open toggle,
 * persisted panel position/size per route). Stored in user_preferences.ai_assistant_prefs.
 */
export function useAiAssistantPrefs() {
  const [prefs, setPrefs] = useState<AiAssistantPrefs>(DEFAULT_PREFS);
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
        .select('ai_assistant_prefs')
        .eq('user_id', user.id)
        .maybeSingle();
      const remote = ((data?.ai_assistant_prefs as any) || {}) as Partial<AiAssistantPrefs>;
      setPrefs({ ...DEFAULT_PREFS, ...remote });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const persist = useCallback(async (next: AiAssistantPrefs) => {
    setPrefs(next);
    const uid = userIdRef.current;
    if (!uid) return;
    try {
      await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: uid,
            ai_assistant_prefs: next as any,
          },
          { onConflict: 'user_id' }
        );
    } catch (e) {
      console.warn('[useAiAssistantPrefs] persist failed', e);
    }
  }, []);

  const setAutoOpenEnabled = useCallback(
    (enabled: boolean) => persist({ ...prefs, auto_open_enabled: enabled }),
    [prefs, persist]
  );

  const setPanelPosition = useCallback(
    (route: string, pos: AiPanelPosition) =>
      persist({
        ...prefs,
        panel_position_by_route: { ...prefs.panel_position_by_route, [route]: pos },
      }),
    [prefs, persist]
  );

  const resetPanelPositions = useCallback(
    () => persist({ ...prefs, panel_position_by_route: {} }),
    [prefs, persist]
  );

  return {
    prefs,
    loading,
    setAutoOpenEnabled,
    setPanelPosition,
    resetPanelPositions,
    reload,
  };
}
