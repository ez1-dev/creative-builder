import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MetricRef } from '@/lib/bi/comercialMetrics';

export interface WidgetLayout { x: number; y: number; w: number; h: number }

export interface ComercialWidget {
  id: string;
  type: string;
  title: string;
  position: number;
  layout: WidgetLayout;
  hidden?: boolean;
  componentId?: string;
  mapping?: Record<string, string>;
  options?: Record<string, any>;
  customTitle?: string;
  variant?: string;
  series?: MetricRef[];
}

export interface SaveLayoutItem {
  type: string;
  layout: WidgetLayout;
  hidden?: boolean;
  componentId?: string | null;
  mapping?: Record<string, string> | null;
  options?: Record<string, any> | null;
  customTitle?: string | null;
  variant?: string | null;
  series?: MetricRef[] | null;
  title?: string;
  position?: number;
}

const MODULE = 'bi-comercial';

/** Layout-padrão usado como fallback quando a tabela ainda está vazia. */
export const COMERCIAL_DEFAULT_WIDGETS: ComercialWidget[] = [
  { id: 'kpi-faturamento', type: 'kpi-faturamento', title: 'Faturamento',  position: 0,  layout: { x: 0, y: 0, w: 3, h: 3 }, variant: 'number' },
  { id: 'kpi-liquido',     type: 'kpi-liquido',     title: 'Líquido',      position: 1,  layout: { x: 3, y: 0, w: 3, h: 3 }, variant: 'number' },
  { id: 'kpi-impostos',    type: 'kpi-impostos',    title: 'Impostos',     position: 2,  layout: { x: 6, y: 0, w: 3, h: 3 }, variant: 'number' },
  { id: 'kpi-devolucao',   type: 'kpi-devolucao',   title: 'Devolução',    position: 3,  layout: { x: 9, y: 0, w: 3, h: 3 }, variant: 'number' },
  { id: 'kpi-vendas',      type: 'kpi-vendas',      title: 'Nº Vendas',    position: 4,  layout: { x: 0, y: 3, w: 3, h: 3 }, variant: 'number' },
  { id: 'kpi-clientes',    type: 'kpi-clientes',    title: 'Nº Clientes',  position: 5,  layout: { x: 3, y: 3, w: 3, h: 3 }, variant: 'number' },
  { id: 'kpi-estados',     type: 'kpi-estados',     title: 'Nº Estados',   position: 6,  layout: { x: 6, y: 3, w: 3, h: 3 }, variant: 'number' },
  { id: 'kpi-ticket',      type: 'kpi-ticket',      title: 'Ticket Médio', position: 7,  layout: { x: 9, y: 3, w: 3, h: 3 }, variant: 'number' },
  { id: 'serie-mensal',    type: 'serie-mensal',    title: 'Faturamento mensal x Meta', position: 8,  layout: { x: 0, y: 6, w: 8, h: 8 },  variant: 'combo' },
  { id: 'mix',             type: 'mix',             title: 'Mix acumulado',             position: 9,  layout: { x: 8, y: 6, w: 4, h: 8 },  variant: 'donut' },
  { id: 'estados',         type: 'estados',         title: 'Top estados',               position: 10, layout: { x: 0, y: 14, w: 6, h: 8 }, variant: 'map' },
  { id: 'revendas',        type: 'revendas',        title: 'Ranking de revendas',       position: 11, layout: { x: 6, y: 14, w: 6, h: 8 }, variant: 'ranking' },
  { id: 'obras',           type: 'obras',           title: 'Faturamento por obra',      position: 12, layout: { x: 0, y: 22, w: 12, h: 8 },variant: 'treemap' },
  { id: 'table-mensal',    type: 'table-mensal',    title: 'Tabela mensal',             position: 13, layout: { x: 0, y: 30, w: 12, h: 10 },variant: 'table' },
];

export function useComercialLayout(enabled: boolean = true) {
  const [widgets, setWidgets] = useState<ComercialWidget[]>(COMERCIAL_DEFAULT_WIDGETS);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mergeWithDefaults = useCallback((rows: ComercialWidget[]): ComercialWidget[] => {
    const byType = new Map(rows.map((r) => [r.type, r]));
    const fromDefaults = COMERCIAL_DEFAULT_WIDGETS.map((d) => byType.get(d.type) ?? d);
    const customs = rows.filter((r) => !COMERCIAL_DEFAULT_WIDGETS.some((d) => d.type === r.type));
    return [...fromDefaults, ...customs].sort((a, b) => a.position - b.position);
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const { data: dash } = await supabase
        .from('dashboards')
        .select('id')
        .eq('module', MODULE)
        .is('owner_id', null)
        .eq('is_default', true)
        .maybeSingle();

      if (!dash) {
        setDashboardId(null);
        setWidgets((prev) => {
          const same = JSON.stringify(prev) === JSON.stringify(COMERCIAL_DEFAULT_WIDGETS);
          return same ? prev : COMERCIAL_DEFAULT_WIDGETS;
        });
        return;
      }
      setDashboardId(dash.id);
      const { data: rows } = await supabase
        .from('dashboard_widgets')
        .select('id, type, title, position, layout, config')
        .eq('dashboard_id', dash.id)
        .order('position');
      const mapped: ComercialWidget[] = (rows ?? []).map((r: any) => {
        const cfg = (r.config ?? {}) as any;
        return {
          id: r.id,
          type: r.type,
          title: r.title,
          position: r.position ?? 0,
          layout: (r.layout ?? { x: 0, y: 0, w: 4, h: 4 }) as WidgetLayout,
          hidden: Boolean(cfg.hidden),
          componentId: cfg.componentId,
          mapping: cfg.mapping,
          options: cfg.options,
          customTitle: cfg.customTitle,
          variant: cfg.variant,
          series: Array.isArray(cfg.series) ? cfg.series : undefined,
        };
      });
      const merged = mergeWithDefaults(mapped);
      setWidgets((prev) => {
        const same = JSON.stringify(prev) === JSON.stringify(merged);
        return same ? prev : merged;
      });
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [mergeWithDefaults]);

  useEffect(() => { if (enabled) load(); }, [enabled, load]);

  const ensureDashboard = useCallback(async (): Promise<string> => {
    const { data: dash } = await supabase
      .from('dashboards')
      .select('id')
      .eq('module', MODULE)
      .is('owner_id', null)
      .eq('is_default', true)
      .maybeSingle();
    if (dash?.id) {
      setDashboardId(dash.id);
      return dash.id;
    }
    const { data, error } = await supabase.rpc('upsert_bi_comercial_dashboard_default');
    if (error) throw error;
    const id = data as unknown as string;
    setDashboardId(id);
    return id;
  }, []);

  const saveLayout = useCallback(async (next: SaveLayoutItem[]) => {
    const id = await ensureDashboard();
    const { data: existing } = await supabase
      .from('dashboard_widgets')
      .select('id, type, config')
      .eq('dashboard_id', id);
    const byType = new Map<string, { id: string; config: any }>(
      (existing ?? []).map((r: any) => [r.type, { id: r.id, config: r.config ?? {} }]),
    );

    const mergeConfig = (prev: any, item: SaveLayoutItem): Record<string, any> => {
      const cfg: Record<string, any> = { ...(prev ?? {}) };
      cfg.hidden = Boolean(item.hidden);
      const setOrDel = (k: keyof SaveLayoutItem, cfgKey: string) => {
        const v = item[k];
        if (v === undefined) return;
        if (v === null || v === '') delete cfg[cfgKey];
        else cfg[cfgKey] = v;
      };
      setOrDel('componentId', 'componentId');
      setOrDel('mapping', 'mapping');
      setOrDel('options', 'options');
      setOrDel('customTitle', 'customTitle');
      setOrDel('variant', 'variant');
      setOrDel('series', 'series');
      return cfg;
    };

    for (const item of next) {
      const ex = byType.get(item.type);
      const nextConfig = mergeConfig(ex?.config, item);
      if (ex) {
        const payload: any = { layout: item.layout as any, config: nextConfig };
        if (typeof item.position === 'number') payload.position = item.position;
        if (typeof item.title === 'string' && item.title) payload.title = item.title;
        await supabase.from('dashboard_widgets').update(payload).eq('id', ex.id);
      } else {
        const def = COMERCIAL_DEFAULT_WIDGETS.find((d) => d.type === item.type);
        await supabase.from('dashboard_widgets').insert({
          dashboard_id: id,
          type: item.type,
          title: item.title ?? def?.title ?? item.type,
          position: item.position ?? def?.position ?? 99,
          layout: item.layout as any,
          config: nextConfig as any,
        });
      }
    }
    await load();
  }, [ensureDashboard, load]);

  const resetLayout = useCallback(async () => {
    const id = await ensureDashboard();
    await supabase.from('dashboard_widgets').delete().eq('dashboard_id', id);
    await supabase.rpc('upsert_bi_comercial_dashboard_default');
    await load({ silent: true });
  }, [ensureDashboard, load]);

  const deleteWidget = useCallback(async (widgetType: string) => {
    const id = dashboardId ?? (await ensureDashboard());
    await supabase.from('dashboard_widgets').delete().eq('dashboard_id', id).eq('type', widgetType);
    await load();
  }, [dashboardId, ensureDashboard, load]);

  return { widgets, dashboardId, loading, saveLayout, resetLayout, deleteWidget, reload: load };
}
