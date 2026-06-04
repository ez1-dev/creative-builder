import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DrillColumnPreset {
  /** Lista ordenada de chaves de coluna que ficam visíveis. */
  visible: string[];
}

export function useDrillPresets(pageKey: string) {
  const [presets, setPresets] = useState<Record<string, DrillColumnPreset>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPresets({}); return; }
      const { data } = await supabase
        .from('bi_user_drill_presets')
        .select('escopo, columns')
        .eq('user_id', user.id)
        .eq('page_key', pageKey);
      const map: Record<string, DrillColumnPreset> = {};
      (data ?? []).forEach((r: any) => { map[r.escopo] = r.columns as DrillColumnPreset; });
      setPresets(map);
    } finally { setLoading(false); }
  }, [pageKey]);

  useEffect(() => { load(); }, [load]);

  const setPreset = useCallback(async (escopo: string, preset: DrillColumnPreset) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('bi_user_drill_presets')
      .upsert(
        { user_id: user.id, page_key: pageKey, escopo, columns: preset as any },
        { onConflict: 'user_id,page_key,escopo' },
      );
    setPresets((p) => ({ ...p, [escopo]: preset }));
  }, [pageKey]);

  const clearPreset = useCallback(async (escopo: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('bi_user_drill_presets')
      .delete()
      .eq('user_id', user.id)
      .eq('page_key', pageKey)
      .eq('escopo', escopo);
    setPresets((p) => { const n = { ...p }; delete n[escopo]; return n; });
  }, [pageKey]);

  return { presets, loading, setPreset, clearPreset, reload: load };
}
