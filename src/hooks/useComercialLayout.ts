import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureDefaultBlockId } from '@/lib/bi/ensureDefaultBlock';
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
  titleColor?: string;
  titleBold?: boolean;
  valueColor?: string;

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
  titleColor?: string | null;
  titleBold?: boolean | null;
  valueColor?: string | null;

  title?: string;
  position?: number;
}

const MODULE = 'bi-comercial';

/** Layout-padrão usado como fallback quando a tabela ainda está vazia. */
export const COMERCIAL_DEFAULT_WIDGETS: ComercialWidget[] = [
  { id: 'kpi-faturamento', type: 'kpi-faturamento', title: 'Faturamento',  position: 0,  layout: { x: 0, y: 0, w: 3, h: 3 }, variant: 'number' },
  { id: 'kpi-liquido',     type: 'kpi-liquido',     title: 'Fat. Líquido', position: 1,  layout: { x: 3, y: 0, w: 3, h: 3 }, variant: 'number' },
  { id: 'kpi-impostos',    type: 'kpi-impostos',    title: 'Impostos',     position: 2,  layout: { x: 6, y: 0, w: 3, h: 3 }, variant: 'number' },
  { id: 'kpi-devolucao',   type: 'kpi-devolucao',   title: 'Devoluções',   position: 3,  layout: { x: 9, y: 0, w: 3, h: 3 }, variant: 'number' },
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

export type ComercialLayoutMode = 'official' | 'personal';
const MODE_STORAGE_KEY = 'bi-comercial:layout-mode';

function readStoredMode(): ComercialLayoutMode {
  if (typeof window === 'undefined') return 'official';
  const v = window.localStorage.getItem(MODE_STORAGE_KEY);
  return v === 'personal' ? 'personal' : 'official';
}

export function useComercialLayout(enabled: boolean = true) {
  const [widgets, setWidgets] = useState<ComercialWidget[]>(COMERCIAL_DEFAULT_WIDGETS);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setModeState] = useState<ComercialLayoutMode>(() => readStoredMode());
  const [hasPersonal, setHasPersonal] = useState(false);
  const [isPersonalEffective, setIsPersonalEffective] = useState(false);


  const mergeWithDefaults = useCallback((rows: ComercialWidget[]): ComercialWidget[] => {
    const byType = new Map(rows.map((r) => [r.type, r]));
    const fromDefaults = COMERCIAL_DEFAULT_WIDGETS.map((d) => byType.get(d.type) ?? d);
    const customs = rows.filter((r) => !COMERCIAL_DEFAULT_WIDGETS.some((d) => d.type === r.type));
    return [...fromDefaults, ...customs].sort((a, b) => a.position - b.position);
  }, []);

  // Reaproveita as referências dos widgets quando nada mudou item a item.
  // Garante identidade estável mesmo quando o array é reconstruído.
  const reuseIdentity = (prev: ComercialWidget[], next: ComercialWidget[]): ComercialWidget[] => {
    const prevByType = new Map(prev.map((p) => [p.type, p]));
    let allSame = prev.length === next.length;
    const merged = next.map((n, i) => {
      const p = prevByType.get(n.type);
      if (p && JSON.stringify(p) === JSON.stringify(n)) {
        if (prev[i] !== p) allSame = false;
        return p;
      }
      allSame = false;
      return n;
    });
    return allSame ? prev : merged;
  };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;

      // Detecta se existe pessoal para este usuário.
      let personalId: string | null = null;
      if (uid) {
        const { data: personal } = await supabase
          .from('dashboards')
          .select('id')
          .eq('module', MODULE)
          .eq('owner_id', uid)
          .maybeSingle();
        personalId = personal?.id ?? null;
      }
      setHasPersonal(Boolean(personalId));

      // Modo efetivo: se pediu pessoal mas não existe, cai pro oficial.
      const effectiveMode: ComercialLayoutMode = mode === 'personal' && personalId ? 'personal' : 'official';
      setIsPersonalEffective(effectiveMode === 'personal');

      let dashId: string | null = null;
      if (effectiveMode === 'personal' && personalId) {
        dashId = personalId;
      } else {
        const { data: dash } = await supabase
          .from('dashboards')
          .select('id')
          .eq('module', MODULE)
          .is('owner_id', null)
          .eq('is_default', true)
          .maybeSingle();
        dashId = dash?.id ?? null;
      }

      if (!dashId) {
        setDashboardId(null);
        setWidgets((prev) => {
          const same = JSON.stringify(prev) === JSON.stringify(COMERCIAL_DEFAULT_WIDGETS);
          return same ? prev : COMERCIAL_DEFAULT_WIDGETS;
        });
        return;
      }
      setDashboardId(dashId);
      const { data: rows } = await supabase
        .from('dashboard_widgets')
        .select('id, type, title, position, layout, config')
        .eq('dashboard_id', dashId)
        .order('position');
      const mapped: ComercialWidget[] = (Array.isArray(rows) ? rows : []).map((r: any) => {
        const safe = r ?? {};
        const cfg = (safe.config ?? {}) as any;
        const layout = (safe.layout ?? { x: 0, y: 0, w: 4, h: 4 }) as WidgetLayout;
        return {
          id: safe.id,
          type: safe.type ?? 'unknown',
          title: safe.title ?? 'Bloco',
          position: typeof safe.position === 'number' ? safe.position : 0,
          layout,
          hidden: Boolean(cfg?.hidden),
          componentId: cfg?.componentId,
          mapping: cfg?.mapping ?? undefined,
          options: cfg?.options ?? undefined,
          customTitle: cfg?.customTitle,
          variant: cfg?.variant,
          series: Array.isArray(cfg?.series) ? cfg.series : undefined,
          titleColor: cfg?.titleColor,
          titleBold: cfg?.titleBold,
          valueColor: cfg?.valueColor,

        };
      });
      const merged = mergeWithDefaults(mapped);
      setWidgets((prev) => reuseIdentity(prev, merged));
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [mergeWithDefaults, mode]);

  useEffect(() => { if (enabled) load(); }, [enabled, load]);

  const setMode = useCallback((next: ComercialLayoutMode) => {
    setModeState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODE_STORAGE_KEY, next);
    }
  }, []);

  const forkToPersonal = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.rpc('fork_bi_comercial_dashboard');
    if (error) throw error;
    setHasPersonal(true);
    setMode('personal');
    return data as unknown as string;
  }, [setMode]);

  const resetPersonal = useCallback(async () => {
    const { error } = await supabase.rpc('reset_bi_comercial_personal_dashboard');
    if (error) throw error;
    setHasPersonal(false);
    setMode('official');
    await load();
  }, [load, setMode]);

  const ensureDashboard = useCallback(async (): Promise<string> => {
    if (isPersonalEffective) {
      // Já temos personal, devolve o id atual; senão fork.
      if (dashboardId) return dashboardId;
      return await forkToPersonal();
    }
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
  }, [dashboardId, forkToPersonal, isPersonalEffective]);


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
      setOrDel('titleColor', 'titleColor');
      setOrDel('titleBold', 'titleBold');
      setOrDel('valueColor', 'valueColor');

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
        const blockId = await ensureDefaultBlockId(id);
        await supabase.from('dashboard_widgets').insert({
          dashboard_id: id,
          block_id: blockId,
          type: item.type,
          title: item.title ?? def?.title ?? item.type,
          position: item.position ?? def?.position ?? 99,
          layout: item.layout as any,
          config: nextConfig as any,
        });
      }
    }
    await load({ silent: true });
  }, [ensureDashboard, load]);

  const resetLayout = useCallback(async () => {
    const id = await ensureDashboard();
    await supabase.from('dashboard_widgets').delete().eq('dashboard_id', id);
    await supabase.rpc('upsert_bi_comercial_dashboard_default');
    await load();
  }, [ensureDashboard, load]);

  const deleteWidget = useCallback(async (widgetType: string) => {
    const id = dashboardId ?? (await ensureDashboard());
    await supabase.from('dashboard_widgets').delete().eq('dashboard_id', id).eq('type', widgetType);
    await load();
  }, [dashboardId, ensureDashboard, load]);

  return { widgets, dashboardId, loading, saveLayout, resetLayout, deleteWidget, reload: load };
}
