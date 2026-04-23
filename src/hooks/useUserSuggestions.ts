import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchSuggestion {
  label: string;
  filters: Record<string, any>;
  count: number;
}

export interface UserPreferences {
  favoriteModules: Array<{ module: string; count: number }>;
  frequentFilters: Record<string, Array<{ filters: Record<string, any>; count: number }>>;
  preferredPeriod?: string | null;
}

function summarizeFilters(filters: Record<string, any>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'boolean') {
      if (v) parts.push(k);
      continue;
    }
    const val = Array.isArray(v) ? v.join(',') : String(v);
    parts.push(`${k}: ${val.length > 18 ? val.slice(0, 18) + '…' : val}`);
  }
  return parts.slice(0, 3).join(' • ') || 'Filtros salvos';
}

/**
 * Returns up to `limit` suggested searches for the given module, based on the
 * user's recent search history (last 30 days).
 *
 * Suggestions are computed client-side from `user_search_history` to keep
 * everything live without depending on the daily preferences job.
 */
export function useUserSuggestions(module: string | null | undefined, limit = 3) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!module) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSuggestions([]);
        return;
      }
      const { data, error } = await supabase
        .from('user_search_history')
        .select('filters')
        .eq('user_id', user.id)
        .eq('module', module)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('[useUserSuggestions]', error);
        setSuggestions([]);
        return;
      }

      // Group identical filter sets and count
      const groups = new Map<string, { filters: Record<string, any>; count: number }>();
      for (const row of data || []) {
        const f = (row.filters || {}) as Record<string, any>;
        const key = JSON.stringify(
          Object.keys(f)
            .sort()
            .reduce((acc, k) => ({ ...acc, [k]: f[k] }), {})
        );
        const existing = groups.get(key);
        if (existing) existing.count++;
        else groups.set(key, { filters: f, count: 1 });
      }

      const list: SearchSuggestion[] = Array.from(groups.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map((g) => ({
          label: summarizeFilters(g.filters),
          filters: g.filters,
          count: g.count,
        }));

      setSuggestions(list);
    } finally {
      setLoading(false);
    }
  }, [module, limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { suggestions, loading, reload };
}

/** Loads aggregated preferences (used in Configurações → Minhas preferências). */
export function useUserPreferences() {
  const [data, setData] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setData(null);
        return;
      }

      // Load stored preferences (computed by daily job)
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefs) {
        setData({
          favoriteModules: (prefs.favorite_modules as any) || [],
          frequentFilters: (prefs.frequent_filters as any) || {},
          preferredPeriod: prefs.preferred_period,
        });
        return;
      }

      // Fallback: compute on the fly from recent history
      const { data: history } = await supabase
        .from('user_search_history')
        .select('module, filters')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      const moduleCounts = new Map<string, number>();
      const filtersByModule = new Map<string, Map<string, { filters: any; count: number }>>();
      for (const row of history || []) {
        moduleCounts.set(row.module, (moduleCounts.get(row.module) || 0) + 1);
        if (!filtersByModule.has(row.module)) filtersByModule.set(row.module, new Map());
        const map = filtersByModule.get(row.module)!;
        const key = JSON.stringify(row.filters);
        const ex = map.get(key);
        if (ex) ex.count++;
        else map.set(key, { filters: row.filters, count: 1 });
      }

      const favoriteModules = Array.from(moduleCounts.entries())
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const frequentFilters: Record<string, Array<{ filters: any; count: number }>> = {};
      for (const [mod, map] of filtersByModule) {
        frequentFilters[mod] = Array.from(map.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }

      setData({ favoriteModules, frequentFilters });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const clearHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_search_history').delete().eq('user_id', user.id);
    await supabase.from('user_preferences').delete().eq('user_id', user.id);
    await reload();
  }, [reload]);

  return { data, loading, reload, clearHistory };
}
