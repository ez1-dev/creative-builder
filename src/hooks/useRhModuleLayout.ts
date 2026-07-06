/**
 * Hook genérico de layout editável para módulos RH.
 *
 * Espelha o padrão de `useComercialLayout`/`usePassagensLayout`, porém
 * simplificado: apenas layout por usuário (owner_id = auth.uid()).
 * Se o usuário ainda não salvou, usa `defaultWidgets` em memória.
 *
 * O layout é persistido em `dashboards` + `dashboard_widgets` com
 * `module = 'rh-<pagina>'`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureDefaultBlockId } from '@/lib/bi/ensureDefaultBlock';

export interface RhWidgetLayout { x: number; y: number; w: number; h: number }

export interface RhWidget {
  id: string;
  type: string;
  title: string;
  position: number;
  layout: RhWidgetLayout;
  hidden?: boolean;
  /** Substituição por componente da Biblioteca BI (id do COMPONENT_REGISTRY). */
  componentId?: string;
  mapping?: Record<string, string>;
  options?: Record<string, any>;
  customTitle?: string;
  variant?: string;
}

export interface RhSaveLayoutItem {
  type: string;
  layout: RhWidgetLayout;
  hidden?: boolean;
  componentId?: string | null;
  mapping?: Record<string, string> | null;
  options?: Record<string, any> | null;
  customTitle?: string | null;
  variant?: string | null;
  title?: string;
  position?: number;
}

function mergeWithDefaults(rows: RhWidget[], defaults: RhWidget[]): RhWidget[] {
  const savedTypes = new Set(rows.map((r) => r.type));
  const missing = defaults.filter((d) => !savedTypes.has(d.type));
  return [...rows, ...missing].sort((a, b) => a.position - b.position);
}

export function useRhModuleLayout(moduleKey: string, defaults: RhWidget[], enabled: boolean = true) {
  const [widgets, setWidgets] = useState<RhWidget[]>(defaults);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      if (!uid) {
        setDashboardId(null);
        setWidgets(defaultsRef.current);
        return;
      }
      const { data: dash } = await supabase
        .from('dashboards')
        .select('id')
        .eq('module', moduleKey)
        .eq('owner_id', uid)
        .maybeSingle();

      if (!dash?.id) {
        setDashboardId(null);
        setWidgets(defaultsRef.current);
        return;
      }
      setDashboardId(dash.id);

      const { data: rows } = await supabase
        .from('dashboard_widgets')
        .select('id, type, title, position, layout, config')
        .eq('dashboard_id', dash.id)
        .order('position');

      const mapped: RhWidget[] = (Array.isArray(rows) ? rows : []).map((r: any) => {
        const cfg = (r?.config ?? {}) as any;
        const layout = (r?.layout ?? { x: 0, y: 0, w: 6, h: 4 }) as RhWidgetLayout;
        return {
          id: r.id,
          type: r.type ?? 'unknown',
          title: r.title ?? 'Bloco',
          position: typeof r.position === 'number' ? r.position : 0,
          layout,
          hidden: Boolean(cfg?.hidden),
          componentId: cfg?.componentId,
          mapping: cfg?.mapping ?? undefined,
          options: cfg?.options ?? undefined,
          customTitle: cfg?.customTitle,
          variant: cfg?.variant,
        };
      });
      setWidgets(mergeWithDefaults(mapped, defaultsRef.current));
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [moduleKey]);

  useEffect(() => { if (enabled) load(); }, [enabled, load]);

  const ensureDashboard = useCallback(async (): Promise<string> => {
    if (dashboardId) return dashboardId;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) throw new Error('Não autenticado');
    const { data: existing } = await supabase
      .from('dashboards')
      .select('id')
      .eq('module', moduleKey)
      .eq('owner_id', uid)
      .maybeSingle();
    if (existing?.id) { setDashboardId(existing.id); return existing.id; }
    const { data, error } = await supabase
      .from('dashboards')
      .insert({ module: moduleKey, name: moduleKey, owner_id: uid, is_default: false, position: 0 })
      .select('id')
      .single();
    if (error) throw error;
    setDashboardId(data.id);
    return data.id;
  }, [dashboardId, moduleKey]);

  const saveLayout = useCallback(async (next: RhSaveLayoutItem[]) => {
    const id = await ensureDashboard();
    const { data: existing } = await supabase
      .from('dashboard_widgets')
      .select('id, type, config')
      .eq('dashboard_id', id);
    const byType = new Map<string, { id: string; config: any }>(
      (existing ?? []).map((r: any) => [r.type, { id: r.id, config: r.config ?? {} }]),
    );

    const mergeConfig = (prev: any, item: RhSaveLayoutItem): Record<string, any> => {
      const cfg: Record<string, any> = { ...(prev ?? {}) };
      cfg.hidden = Boolean(item.hidden);
      const setOrDel = (k: keyof RhSaveLayoutItem, cfgKey: string) => {
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
      return cfg;
    };

    for (const item of next) {
      const ex = byType.get(item.type);
      const nextConfig = mergeConfig(ex?.config, item);
      if (ex) {
        const payload: any = { layout: item.layout as any, config: nextConfig };
        if (typeof item.position === 'number') payload.position = item.position;
        if (typeof item.title === 'string' && item.title) payload.title = item.title;
        const { error } = await supabase.from('dashboard_widgets').update(payload).eq('id', ex.id);
        if (error) throw error;
      } else {
        const def = defaultsRef.current.find((d) => d.type === item.type);
        const blockId = await ensureDefaultBlockId(id);
        const { error } = await supabase.from('dashboard_widgets').insert({
          dashboard_id: id,
          block_id: blockId,
          type: item.type,
          title: item.title ?? def?.title ?? item.type,
          position: item.position ?? def?.position ?? 99,
          layout: item.layout as any,
          config: nextConfig as any,
        });
        if (error) throw error;
      }
    }
    await load({ silent: true });
  }, [ensureDashboard, load]);

  /** Persiste apenas geometrias (usado pelo grid ao arrastar/redimensionar). */
  const saveGeometries = useCallback(async (next: { type: string; layout: RhWidgetLayout }[]) => {
    const items: RhSaveLayoutItem[] = next.map((n, i) => {
      const cur = widgets.find((w) => w.type === n.type);
      return {
        type: n.type,
        layout: n.layout,
        hidden: cur?.hidden ?? false,
        position: i,
        title: cur?.title,
      };
    });
    await saveLayout(items);
  }, [saveLayout, widgets]);

  const hideWidget = useCallback(async (type: string) => {
    const cur = widgets.find((w) => w.type === type);
    if (!cur) return;
    await saveLayout([{ type, layout: cur.layout, hidden: true, title: cur.title, position: cur.position }]);
  }, [saveLayout, widgets]);

  const showWidget = useCallback(async (type: string) => {
    const cur = widgets.find((w) => w.type === type);
    if (!cur) return;
    await saveLayout([{ type, layout: cur.layout, hidden: false, title: cur.title, position: cur.position }]);
  }, [saveLayout, widgets]);

  const configureWidget = useCallback(async (
    type: string,
    patch: { variant?: string | null; componentId?: string | null; mapping?: Record<string, string> | null; options?: Record<string, any> | null; customTitle?: string | null },
  ) => {
    const cur = widgets.find((w) => w.type === type);
    if (!cur) return;
    await saveLayout([{
      type,
      layout: cur.layout,
      hidden: cur.hidden ?? false,
      title: cur.title,
      position: cur.position,
      ...patch,
    }]);
  }, [saveLayout, widgets]);

  const resetLayout = useCallback(async () => {
    if (!dashboardId) return;
    const { error } = await supabase.from('dashboards').delete().eq('id', dashboardId);
    if (error) throw error;
    setDashboardId(null);
    setWidgets(defaultsRef.current);
    await load({ silent: true });
  }, [dashboardId, load]);

  return {
    widgets, loading, editing, setEditing,
    saveLayout, saveGeometries, hideWidget, showWidget, configureWidget, resetLayout, reload: load,
  };
}
