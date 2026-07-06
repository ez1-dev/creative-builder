/**
 * Hook genérico de layout editável para módulos RH.
 *
 * Otimizações:
 *  - Optimistic UI: aplica mudanças no estado local antes do save.
 *  - Saves em paralelo por id (sem loop `await`).
 *  - Sem reload silencioso no caminho feliz.
 *  - Fila de 1 para coalescing de saves concorrentes.
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
  componentId?: string;
  mapping?: Record<string, string>;
  options?: Record<string, any>;
  customTitle?: string;
  variant?: string;
  /** Config completo do banco (para preservar campos desconhecidos ao salvar). */
  _config?: Record<string, any>;
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
  // Sort: primeiro por position, com estabilidade preservando ordem de entrada.
  const merged = [...rows, ...missing];
  return merged
    .map((w, i) => ({ w, i }))
    .sort((a, b) => a.w.position - b.w.position || a.i - b.i)
    .map((x) => x.w);
}

export function useRhModuleLayout(moduleKey: string, defaults: RhWidget[], enabled: boolean = true) {
  const [widgets, setWidgets] = useState<RhWidget[]>(defaults);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  // Fila de 1 para coalescing de saves concorrentes.
  const savingRef = useRef(false);
  const pendingRef = useRef<RhSaveLayoutItem[] | null>(null);

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
          _config: cfg,
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

  const runSave = useCallback(async (next: RhSaveLayoutItem[]) => {
    const id = await ensureDashboard();

    // Optimistic: aplica no estado local imediatamente.
    let optimisticNextConfigByType: Map<string, Record<string, any>> | null = null;
    setWidgets((prev) => {
      const byType = new Map(prev.map((w) => [w.type, w]));
      const configMap = new Map<string, Record<string, any>>();
      next.forEach((item) => {
        const cur = byType.get(item.type);
        const nextConfig = mergeConfig(cur?._config, item);
        configMap.set(item.type, nextConfig);
        byType.set(item.type, {
          id: cur?.id ?? `tmp-${item.type}`,
          type: item.type,
          title: item.title ?? cur?.title ?? item.type,
          position: typeof item.position === 'number' ? item.position : cur?.position ?? 99,
          layout: item.layout,
          hidden: Boolean(item.hidden),
          componentId: nextConfig.componentId,
          mapping: nextConfig.mapping,
          options: nextConfig.options,
          customTitle: nextConfig.customTitle,
          variant: nextConfig.variant,
          _config: nextConfig,
        });
      });
      optimisticNextConfigByType = configMap;
      return mergeWithDefaults(Array.from(byType.values()), defaultsRef.current);
    });

    // Separa updates (têm id real) e inserts (id tmp- ou inexistente).
    // Precisamos ler o estado atualizado sincronamente — busca via widgets ref.
    const currentWidgets = widgetsRef.current;
    const byType = new Map(currentWidgets.map((w) => [w.type, w]));

    const toUpdate: any[] = [];
    const toInsert: RhSaveLayoutItem[] = [];
    for (const item of next) {
      const cur = byType.get(item.type);
      const nextConfig = optimisticNextConfigByType?.get(item.type)
        ?? mergeConfig(cur?._config, item);
      if (cur?.id && !String(cur.id).startsWith('tmp-')) {
        const payload: any = { layout: item.layout, config: nextConfig };
        if (typeof item.position === 'number') payload.position = item.position;
        if (typeof item.title === 'string' && item.title) payload.title = item.title;
        toUpdate.push({ id: cur.id, payload });
      } else {
        toInsert.push(item);
      }
    }

    // Updates em paralelo.
    const updatesPromise = Promise.all(
      toUpdate.map((u) =>
        supabase.from('dashboard_widgets').update(u.payload).eq('id', u.id),
      ),
    );

    // Inserts precisam de block_id — resolve uma única vez.
    let insertRes: any = null;
    if (toInsert.length > 0) {
      const blockId = await ensureDefaultBlockId(id);
      const rows = toInsert.map((item) => {
        const def = defaultsRef.current.find((d) => d.type === item.type);
        const cfg = optimisticNextConfigByType?.get(item.type) ?? mergeConfig({}, item);
        return {
          dashboard_id: id,
          block_id: blockId,
          type: item.type,
          title: item.title ?? def?.title ?? item.type,
          position: item.position ?? def?.position ?? 99,
          layout: item.layout as any,
          config: cfg as any,
        };
      });
      insertRes = await supabase
        .from('dashboard_widgets')
        .insert(rows)
        .select('id, type');
    }

    const updateRes = await updatesPromise;

    // Atualiza ids dos inseridos no estado.
    const inserted = insertRes?.data as { id: string; type: string }[] | undefined;
    if (inserted && inserted.length > 0) {
      setWidgets((prev) => prev.map((w) => {
        const match = inserted.find((r) => r.type === w.type);
        return match ? { ...w, id: match.id } : w;
      }));
    }

    // Verifica erros; em caso de falha, faz reload para reconciliar.
    const anyError = insertRes?.error || updateRes.find((r: any) => r?.error);
    if (anyError) {
      await load({ silent: true });
      throw new Error((anyError as any)?.error?.message || 'Falha ao salvar layout');
    }
  }, [ensureDashboard, load]);

  const widgetsRef = useRef(widgets);
  useEffect(() => { widgetsRef.current = widgets; }, [widgets]);

  const saveLayout = useCallback(async (next: RhSaveLayoutItem[]) => {
    if (savingRef.current) {
      // Coalesca: guarda o mais recente pedido.
      pendingRef.current = next;
      return;
    }
    savingRef.current = true;
    try {
      await runSave(next);
      // Se houve pedido pendente durante o save, dispara em seguida.
      while (pendingRef.current) {
        const nextPending = pendingRef.current;
        pendingRef.current = null;
        await runSave(nextPending);
      }
    } finally {
      savingRef.current = false;
    }
  }, [runSave]);

  const saveGeometries = useCallback(async (next: { type: string; layout: RhWidgetLayout }[]) => {
    const cur = widgetsRef.current;
    const items: RhSaveLayoutItem[] = next.map((n, i) => {
      const w = cur.find((x) => x.type === n.type);
      return {
        type: n.type,
        layout: n.layout,
        hidden: w?.hidden ?? false,
        position: i,
        title: w?.title,
      };
    });
    await saveLayout(items);
  }, [saveLayout]);

  const hideWidget = useCallback(async (type: string) => {
    const cur = widgetsRef.current.find((w) => w.type === type);
    if (!cur) return;
    await saveLayout([{ type, layout: cur.layout, hidden: true, title: cur.title, position: cur.position }]);
  }, [saveLayout]);

  const showWidget = useCallback(async (type: string) => {
    const cur = widgetsRef.current.find((w) => w.type === type);
    if (!cur) return;
    await saveLayout([{ type, layout: cur.layout, hidden: false, title: cur.title, position: cur.position }]);
  }, [saveLayout]);

  const configureWidget = useCallback(async (
    type: string,
    patch: { variant?: string | null; componentId?: string | null; mapping?: Record<string, string> | null; options?: Record<string, any> | null; customTitle?: string | null },
  ) => {
    const cur = widgetsRef.current.find((w) => w.type === type);
    if (!cur) return;
    await saveLayout([{
      type,
      layout: cur.layout,
      hidden: cur.hidden ?? false,
      title: cur.title,
      position: cur.position,
      ...patch,
    }]);
  }, [saveLayout]);

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
