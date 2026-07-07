/**
 * Hook genérico de layout editável para módulos RH.
 *
 * Modo edição bufferizado:
 *  - Fora do modo edição: mutações persistem imediatamente (comportamento original).
 *  - Dentro do modo edição: mutações ficam em memória (rascunho). Só são gravadas
 *    ao chamar `commitEdits()`. `cancelEdits()` restaura o snapshot inicial.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureDefaultBlockId } from '@/lib/bi/ensureDefaultBlock';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id);

const clampLayout = (layout: RhWidgetLayout): RhWidgetLayout => {
  const w = Math.max(1, Math.min(12, Math.round(Number(layout?.w) || 6)));
  const h = Math.max(1, Math.round(Number(layout?.h) || 4));
  const x = Math.max(0, Math.min(12 - w, Math.round(Number(layout?.x) || 0)));
  const y = Math.max(0, Math.round(Number(layout?.y) || 0));
  return { x, y, w, h };
};

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
  const merged = [...rows, ...missing];
  return merged
    .map((w, i) => ({ w, i }))
    .sort((a, b) => a.w.position - b.w.position || a.i - b.i)
    .map((x) => x.w);
}

function mergeSaveItem(prev: RhSaveLayoutItem | undefined, item: RhSaveLayoutItem): RhSaveLayoutItem {
  if (!prev) return { ...item, layout: clampLayout(item.layout) };
  const merged: RhSaveLayoutItem = { ...prev };
  (Object.keys(item) as (keyof RhSaveLayoutItem)[]).forEach((key) => {
    const value = item[key];
    if (value !== undefined) {
      (merged as any)[key] = key === 'layout' ? clampLayout(value as RhWidgetLayout) : value;
    }
  });
  return merged;
}

function mergeSaveBatches(prev: RhSaveLayoutItem[] | null, next: RhSaveLayoutItem[]): RhSaveLayoutItem[] {
  const byType = new Map<string, RhSaveLayoutItem>();
  (prev ?? []).forEach((item) => byType.set(item.type, mergeSaveItem(undefined, item)));
  next.forEach((item) => byType.set(item.type, mergeSaveItem(byType.get(item.type), item)));
  return Array.from(byType.values());
}

function cloneWidgets(list: RhWidget[]): RhWidget[] {
  return list.map((w) => ({
    ...w,
    layout: { ...w.layout },
    mapping: w.mapping ? { ...w.mapping } : undefined,
    options: w.options ? { ...w.options } : undefined,
    _config: w._config ? { ...w._config } : undefined,
  }));
}

export function useRhModuleLayout(moduleKey: string, defaults: RhWidget[], enabled: boolean = true) {
  const [widgets, setWidgets] = useState<RhWidget[]>(defaults);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [layoutReady, setLayoutReady] = useState(false);
  const [editing, setEditingState] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  // Fila de 1 para coalescing de saves concorrentes.
  const savingRef = useRef(false);
  const pendingRef = useRef<RhSaveLayoutItem[] | null>(null);

  // Rascunho enquanto editing === true.
  const editingRef = useRef(false);
  const pendingItemsRef = useRef<Map<string, RhSaveLayoutItem>>(new Map());
  const pendingDeletesRef = useRef<Set<string>>(new Set());
  const snapshotRef = useRef<RhWidget[] | null>(null);

  useEffect(() => { editingRef.current = editing; }, [editing]);

  const markPending = useCallback((item: RhSaveLayoutItem) => {
    const cur = pendingItemsRef.current.get(item.type);
    pendingItemsRef.current.set(item.type, mergeSaveItem(cur, item));
    setHasPendingChanges(true);
  }, []);

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
      setLayoutReady(true);
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
    if (item.hidden !== undefined) cfg.hidden = Boolean(item.hidden);
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

  const widgetsRef = useRef(widgets);
  useEffect(() => { widgetsRef.current = widgets; }, [widgets]);

  const runSave = useCallback(async (next: RhSaveLayoutItem[]) => {
    const id = await ensureDashboard();
    const sanitizedNext = next.map((item) => ({ ...item, layout: clampLayout(item.layout) }));

    const { data: existingRows, error: existingError } = await supabase
      .from('dashboard_widgets')
      .select('id, type, title, position, layout, config')
      .eq('dashboard_id', id);
    if (existingError) throw existingError;

    const existingByType = new Map<string, any>(
      (Array.isArray(existingRows) ? existingRows : []).map((row: any) => [row.type, row]),
    );

    let optimisticNextConfigByType: Map<string, Record<string, any>> | null = null;
    setWidgets((prev) => {
      const byType = new Map(prev.map((w) => [w.type, w]));
      const configMap = new Map<string, Record<string, any>>();
      sanitizedNext.forEach((item) => {
        const cur = byType.get(item.type);
        const existing = existingByType.get(item.type);
        const nextConfig = mergeConfig(existing?.config ?? cur?._config, item);
        configMap.set(item.type, nextConfig);
        byType.set(item.type, {
          id: existing?.id ?? cur?.id ?? `tmp-${item.type}`,
          type: item.type,
          title: item.title ?? existing?.title ?? cur?.title ?? item.type,
          position: typeof item.position === 'number' ? item.position : (typeof existing?.position === 'number' ? existing.position : cur?.position ?? 99),
          layout: item.layout,
          hidden: item.hidden !== undefined ? Boolean(item.hidden) : Boolean(nextConfig.hidden ?? cur?.hidden),
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

    const currentWidgets = widgetsRef.current;
    const byType = new Map(currentWidgets.map((w) => [w.type, w]));

    const toUpdate: any[] = [];
    const toInsert: RhSaveLayoutItem[] = [];
    for (const item of sanitizedNext) {
      const cur = byType.get(item.type);
      const existing = existingByType.get(item.type);
      const nextConfig = optimisticNextConfigByType?.get(item.type)
        ?? mergeConfig(existing?.config ?? cur?._config, item);
      if (existing?.id || (cur?.id && isUuid(cur.id))) {
        const payload: any = { layout: item.layout, config: nextConfig };
        if (typeof item.position === 'number') payload.position = item.position;
        if (typeof item.title === 'string' && item.title) payload.title = item.title;
        toUpdate.push({ id: existing?.id ?? cur!.id, payload });
      } else {
        toInsert.push(item);
      }
    }

    const updatesPromise = Promise.all(
      toUpdate.map((u) =>
        supabase.from('dashboard_widgets').update(u.payload).eq('id', u.id),
      ),
    );

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

    const inserted = insertRes?.data as { id: string; type: string }[] | undefined;
    if (inserted && inserted.length > 0) {
      setWidgets((prev) => prev.map((w) => {
        const match = inserted.find((r) => r.type === w.type);
        return match ? { ...w, id: match.id } : w;
      }));
    }

    const anyError = insertRes?.error || updateRes.find((r: any) => r?.error);
    if (anyError) {
      await load({ silent: true });
      throw new Error((anyError as any)?.error?.message || 'Falha ao salvar layout');
    }
  }, [ensureDashboard, load]);

  const saveLayout = useCallback(async (next: RhSaveLayoutItem[]) => {
    if (savingRef.current) {
      pendingRef.current = mergeSaveBatches(pendingRef.current, next);
      return;
    }
    savingRef.current = true;
    try {
      await runSave(next);
      while (pendingRef.current) {
        const nextPending = pendingRef.current;
        pendingRef.current = null;
        await runSave(nextPending);
      }
    } finally {
      savingRef.current = false;
    }
  }, [runSave]);

  // -------- Modo edição: rascunho + commit/cancel --------

  const beginEdit = useCallback(() => {
    snapshotRef.current = cloneWidgets(widgetsRef.current);
    pendingItemsRef.current = new Map();
    pendingDeletesRef.current = new Set();
    setHasPendingChanges(false);
    setEditingState(true);
  }, []);

  const cancelEdits = useCallback(async () => {
    const snap = snapshotRef.current;
    pendingItemsRef.current = new Map();
    pendingDeletesRef.current = new Set();
    setHasPendingChanges(false);
    setEditingState(false);
    if (snap) setWidgets(snap);
    snapshotRef.current = null;
    await load({ silent: true });
  }, [load]);

  const commitEdits = useCallback(async () => {
    const items = Array.from(pendingItemsRef.current.values());
    const deletes = Array.from(pendingDeletesRef.current);
    try {
      if (items.length) await saveLayout(items);
      if (deletes.length) {
        const results = await Promise.all(
          deletes.map((id) => supabase.from('dashboard_widgets').delete().eq('id', id)),
        );
        const err = results.find((r: any) => r?.error);
        if (err) throw new Error((err as any).error?.message || 'Falha ao excluir widget');
      }
      pendingItemsRef.current = new Map();
      pendingDeletesRef.current = new Set();
      snapshotRef.current = null;
      setHasPendingChanges(false);
      setEditingState(false);
      await load({ silent: true });
    } catch (e) {
      throw e;
    }
  }, [saveLayout, load]);

  const setEditing = useCallback((v: boolean) => {
    if (v) beginEdit();
    else void cancelEdits();
  }, [beginEdit, cancelEdits]);

  // -------- Mutações: buffer se editing, senão persistem --------

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
    if (editingRef.current) {
      setWidgets((prev) => {
        const map = new Map(prev.map((w) => [w.type, w]));
        items.forEach((it) => {
          const c = map.get(it.type);
          if (!c) return;
          map.set(it.type, { ...c, layout: clampLayout(it.layout), position: it.position ?? c.position });
        });
        return Array.from(map.values());
      });
      items.forEach(markPending);
      return;
    }
    await saveLayout(items);
  }, [saveLayout, markPending]);

  const hideWidget = useCallback(async (type: string) => {
    const cur = widgetsRef.current.find((w) => w.type === type);
    if (!cur) return;
    if (editingRef.current) {
      setWidgets((prev) => prev.map((w) => w.type === type ? { ...w, hidden: true } : w));
      markPending({ type, layout: cur.layout, hidden: true, title: cur.title, position: cur.position });
      return;
    }
    await saveLayout([{ type, layout: cur.layout, hidden: true, title: cur.title, position: cur.position }]);
  }, [saveLayout, markPending]);

  const showWidget = useCallback(async (type: string) => {
    const cur = widgetsRef.current.find((w) => w.type === type);
    if (!cur) return;
    if (editingRef.current) {
      setWidgets((prev) => prev.map((w) => w.type === type ? { ...w, hidden: false } : w));
      markPending({ type, layout: cur.layout, hidden: false, title: cur.title, position: cur.position });
      return;
    }
    await saveLayout([{ type, layout: cur.layout, hidden: false, title: cur.title, position: cur.position }]);
  }, [saveLayout, markPending]);

  const configureWidget = useCallback(async (
    type: string,
    patch: { variant?: string | null; componentId?: string | null; mapping?: Record<string, string> | null; options?: Record<string, any> | null; customTitle?: string | null },
  ) => {
    const cur = widgetsRef.current.find((w) => w.type === type);
    if (!cur) return;
    if (editingRef.current) {
      setWidgets((prev) => prev.map((w) => {
        if (w.type !== type) return w;
        const nextCfg: Record<string, any> = { ...(w._config ?? {}) };
        const apply = (k: string, val: any) => {
          if (val === undefined) return;
          if (val === null || val === '') delete nextCfg[k];
          else nextCfg[k] = val;
        };
        apply('componentId', patch.componentId);
        apply('mapping', patch.mapping);
        apply('options', patch.options);
        apply('customTitle', patch.customTitle);
        apply('variant', patch.variant);
        return {
          ...w,
          componentId: nextCfg.componentId,
          mapping: nextCfg.mapping,
          options: nextCfg.options,
          customTitle: nextCfg.customTitle,
          variant: nextCfg.variant,
          _config: nextCfg,
        };
      }));
      markPending({
        type,
        layout: cur.layout,
        hidden: cur.hidden ?? false,
        title: cur.title,
        position: cur.position,
        ...patch,
      });
      return;
    }
    await saveLayout([{
      type,
      layout: cur.layout,
      hidden: cur.hidden ?? false,
      title: cur.title,
      position: cur.position,
      ...patch,
    }]);
  }, [saveLayout, markPending]);

  const resetLayout = useCallback(async () => {
    if (!dashboardId) return;
    const { error } = await supabase.from('dashboards').delete().eq('id', dashboardId);
    if (error) throw error;
    setDashboardId(null);
    setWidgets(defaultsRef.current);
    pendingItemsRef.current = new Map();
    pendingDeletesRef.current = new Set();
    snapshotRef.current = null;
    setHasPendingChanges(false);
    setEditingState(false);
    await load({ silent: true });
  }, [dashboardId, load]);

  const addWidget = useCallback(async (payload: {
    componentId: string;
    title: string;
    mapping?: Record<string, string>;
    options?: Record<string, any>;
  }) => {
    const type = `custom-${Date.now()}`;
    const maxY = widgetsRef.current.reduce((acc, w) => Math.max(acc, (w.layout?.y ?? 0) + (w.layout?.h ?? 0)), 0);
    const layout = { x: 0, y: maxY, w: 6, h: 6 };
    const position = widgetsRef.current.length;
    const item: RhSaveLayoutItem = {
      type,
      title: payload.title,
      layout,
      hidden: false,
      position,
      componentId: payload.componentId,
      mapping: payload.mapping ?? {},
      options: payload.options ?? {},
    };
    if (editingRef.current) {
      setWidgets((prev) => [...prev, {
        id: `tmp-${type}`,
        type,
        title: payload.title,
        position,
        layout,
        hidden: false,
        componentId: payload.componentId,
        mapping: payload.mapping ?? {},
        options: payload.options ?? {},
        _config: {
          componentId: payload.componentId,
          mapping: payload.mapping ?? {},
          options: payload.options ?? {},
        },
      }]);
      markPending(item);
      return;
    }
    await saveLayout([item]);
  }, [saveLayout, markPending]);

  const deleteWidget = useCallback(async (type: string) => {
    const cur = widgetsRef.current.find((w) => w.type === type);
    if (!cur) return;
    if (editingRef.current) {
      if (cur.id && isUuid(cur.id)) pendingDeletesRef.current.add(cur.id);
      pendingItemsRef.current.delete(type);
      setWidgets((prev) => prev.filter((w) => w.type !== type));
      setHasPendingChanges(true);
      return;
    }
    if (!cur.id || !isUuid(cur.id)) return;
    const { error } = await supabase.from('dashboard_widgets').delete().eq('id', cur.id);
    if (error) throw error;
    setWidgets((prev) => prev.filter((w) => w.type !== type));
  }, []);

  return {
    widgets, loading, layoutReady, editing, setEditing,
    saveLayout, saveGeometries, hideWidget, showWidget, configureWidget,
    addWidget, deleteWidget, resetLayout, reload: load,
    commitEdits, cancelEdits, hasPendingChanges,
  };
}
