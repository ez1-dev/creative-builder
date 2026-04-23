import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to record a user's search in the user_search_history table.
 * Lightweight, async, never blocks UI. Filters with empty values are stripped.
 *
 * Usage:
 *   const trackSearch = useSearchTracking('estoque');
 *   // after a successful search:
 *   trackSearch(filters, results.length);
 */
export function useSearchTracking(module: string) {
  return useCallback(
    async (filters: Record<string, any>, resultCount?: number) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Strip empty / default values to keep the history meaningful
        const cleanFilters: Record<string, any> = {};
        for (const [k, v] of Object.entries(filters || {})) {
          if (v === '' || v === null || v === undefined) continue;
          if (Array.isArray(v) && v.length === 0) continue;
          cleanFilters[k] = v;
        }

        // Skip noisy "empty" searches
        if (Object.keys(cleanFilters).length === 0) return;

        await supabase.from('user_search_history').insert({
          user_id: user.id,
          module,
          filters: cleanFilters,
          result_count: typeof resultCount === 'number' ? resultCount : null,
        });
      } catch (err) {
        // Tracking must never break the UX
        console.warn('[useSearchTracking] failed:', err);
      }
    },
    [module]
  );
}
