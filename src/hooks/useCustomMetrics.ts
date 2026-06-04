/**
 * CRUD de métricas calculadas por usuário, por página.
 * Persiste em public.bi_user_custom_metrics (RLS por auth.uid()).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CustomMetric, MetricFormat } from '@/lib/bi/comercialMetrics';

export function useCustomMetrics(pageKey: string) {
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMetrics([]); return; }
      const { data, error } = await supabase
        .from('bi_user_custom_metrics')
        .select('metric_id, label, formula, format')
        .eq('page_key', pageKey)
        .order('created_at');
      if (error) throw error;
      setMetrics((data ?? []).map((r: any) => ({
        id: r.metric_id, label: r.label, formula: r.formula, format: r.format as MetricFormat,
      })));
    } finally {
      setLoading(false);
    }
  }, [pageKey]);

  useEffect(() => { load(); }, [load]);

  const upsert = useCallback(async (m: CustomMetric) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');
    const { error } = await supabase
      .from('bi_user_custom_metrics')
      .upsert({
        user_id: user.id, page_key: pageKey,
        metric_id: m.id, label: m.label, formula: m.formula, format: m.format,
      }, { onConflict: 'user_id,page_key,metric_id' });
    if (error) throw error;
    await load();
  }, [pageKey, load]);

  const remove = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('bi_user_custom_metrics')
      .delete()
      .eq('page_key', pageKey)
      .eq('metric_id', id);
    await load();
  }, [pageKey, load]);

  return { metrics, loading, upsert, remove, reload: load };
}
