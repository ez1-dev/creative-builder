import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureDefaultBlockId } from '@/lib/bi/ensureDefaultBlock';
import type { PassagensWidget, WidgetLayout, SaveLayoutItem } from '@/hooks/usePassagensLayout';

/**
 * Alias: a estrutura do widget é a mesma do módulo de Passagens.
 * Mantemos o nome `FrotaWidget` para clareza nos consumidores.
 */
export type FrotaWidget = PassagensWidget;
export type { WidgetLayout, SaveLayoutItem } from '@/hooks/usePassagensLayout';

/** Lista canônica dos blocos do dashboard de Manutenção de Frota. */
export const FROTA_DEFAULT_WIDGETS: FrotaWidget[] = [
  { id: 'kpis-row',                type: 'kpis-row',                title: 'KPIs',                  position: 0, layout: { x: 0, y: 0,  w: 12, h: 3  } },
  { id: 'chart-evolucao-mensal',   type: 'chart-evolucao-mensal',   title: 'Evolução Mensal',       position: 1, layout: { x: 0, y: 3,  w: 6,  h: 8  } },
  { id: 'chart-segmento',          type: 'chart-segmento',          title: 'Por Segmento',          position: 2, layout: { x: 6, y: 3,  w: 6,  h: 8  } },
  { id: 'chart-top-veiculos',      type: 'chart-top-veiculos',      title: 'Top Veículos',          position: 3, layout: { x: 0, y: 11, w: 6,  h: 8  } },
  { id: 'chart-top-fornecedores',  type: 'chart-top-fornecedores',  title: 'Top Fornecedores',      position: 4, layout: { x: 6, y: 11, w: 6,  h: 8  } },
  { id: 'chart-top-cc',            type: 'chart-top-cc',            title: 'Top Centros de Custo',  position: 5, layout: { x: 0, y: 19, w: 6,  h: 8  } },
  { id: 'chart-top-motoristas',    type: 'chart-top-motoristas',    title: 'Top Motoristas',        position: 6, layout: { x: 6, y: 19, w: 6,  h: 8  } },
  { id: 'chart-tipo-veiculo',      type: 'chart-tipo-veiculo',      title: 'Por Tipo de Veículo',   position: 7, layout: { x: 0, y: 27, w: 12, h: 8  } },
  { id: 'tabela-registros',        type: 'tabela-registros',        title: 'Registros',             position: 8, layout: { x: 0, y: 35, w: 12, h: 10 } },
];

interface Options { shareToken?: string | null; enabled?: boolean; }

/**
 * Hook que carrega o layout do dashboard de Manutenção de Frota.
 * Espelho de usePassagensLayout, mas apontando para `module = 'frota'`.
 */
export function useFrotaLayout({ shareToken, enabled = true }: Options = {}) {
  const [widgets, setWidgets] = useState<FrotaWidget[]>(FROTA_DEFAULT_WIDGETS);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  const mergeWithDefaults = useCallback((rows: FrotaWidget[]): FrotaWidget[] => {
    const byType = new Map(rows.map((r) => [r.type, r]));
    const fromDefaults = FROTA_DEFAULT_WIDGETS.map((d) => byType.get(d.type) ?? d);
    const customs = rows.filter((r) => !FROTA_DEFAULT_WIDGETS.some((d) => d.type === r.type));
    return [...fromDefaults, ...customs].sort((a, b) => a.position - b.position);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (shareToken) {
        const { data, error } = await (supabase.rpc as any)('get_frota_layout_via_token', { _token: shareToken });
        if (error) { setWidgets(FROTA_DEFAULT_WIDGETS); return; }
        const rows = (data ?? []).map((r: any) => {
          const cfg = (r.widget_config ?? {}) as any;
          return {
            id: r.widget_id,
            type: r.widget_type,
            title: r.widget_title,
            position: r.widget_position ?? 0,
            layout: (r.widget_layout ?? {}) as WidgetLayout,
            hidden: Boolean(cfg.hidden),
            componentId: cfg.componentId,
            mapping: cfg.mapping,
            options: cfg.options,
            customTitle: cfg.customTitle,
          } as FrotaWidget;
        });
        setWidgets(mergeWithDefaults(rows));
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: editCheck } = await supabase.rpc('can_edit_frota', { _uid: user.id });
          setCanEdit(Boolean(editCheck));
        }
        const { data: dash } = await supabase
          .from('dashboards')
          .select('id')
          .eq('module', 'frota')
          .is('owner_id', null)
          .eq('is_default', true)
          .maybeSingle();
        if (!dash) { setDashboardId(null); setWidgets(FROTA_DEFAULT_WIDGETS); return; }
        setDashboardId(dash.id);
        const { data: rows } = await supabase
          .from('dashboard_widgets')
          .select('id, type, title, position, layout, config')
          .eq('dashboard_id', dash.id)
          .order('position');
        const mapped: FrotaWidget[] = (rows ?? []).map((r: any) => {
          const cfg = (r.config ?? {}) as any;
          return {
            id: r.id, type: r.type, title: r.title,
            position: r.position ?? 0,
            layout: (r.layout ?? {}) as WidgetLayout,
            hidden: Boolean(cfg.hidden),
            componentId: cfg.componentId,
            mapping: cfg.mapping,
            options: cfg.options,
            customTitle: cfg.customTitle,
          };
        });
        setWidgets(mergeWithDefaults(mapped));
      }
    } finally { setLoading(false); }
  }, [shareToken, mergeWithDefaults]);

  useEffect(() => { if (enabled) load(); }, [enabled, load]);

  const saveLayout = useCallback(async (next: SaveLayoutItem[]) => {
    let id: string | null = null;
    const { data: dash } = await supabase
      .from('dashboards')
      .select('id')
      .eq('module', 'frota')
      .is('owner_id', null)
      .eq('is_default', true)
      .maybeSingle();
    if (dash?.id) id = dash.id;
    else {
      const { data: dashId, error: rpcError } = await (supabase.rpc as any)('upsert_frota_dashboard_default');
      if (rpcError) throw rpcError;
      id = dashId as string;
    }
    setDashboardId(id);

    const { data: existing, error: fetchErr } = await supabase
      .from('dashboard_widgets')
      .select('id, type, config')
      .eq('dashboard_id', id!);
    if (fetchErr) throw fetchErr;
    const byType = new Map<string, { id: string; config: any }>(
      (existing ?? []).map((r: any) => [r.type, { id: r.id, config: r.config ?? {} }]),
    );

    const mergeConfig = (prev: any, item: SaveLayoutItem): Record<string, any> => {
      const cfg: Record<string, any> = { ...(prev ?? {}) };
      cfg.hidden = Boolean(item.hidden);
      if (item.componentId !== undefined) { if (item.componentId === null) delete cfg.componentId; else cfg.componentId = item.componentId; }
      if (item.mapping !== undefined) { if (item.mapping === null) delete cfg.mapping; else cfg.mapping = item.mapping; }
      if (item.options !== undefined) { if (item.options === null) delete cfg.options; else cfg.options = item.options; }
      if (item.customTitle !== undefined) { if (item.customTitle === null || item.customTitle === '') delete cfg.customTitle; else cfg.customTitle = item.customTitle; }
      return cfg;
    };

    const errors: string[] = [];
    for (const item of next) {
      const { type, layout } = item;
      const ex = byType.get(type);
      const nextConfig = mergeConfig(ex?.config, item);
      if (ex) {
        const updatePayload: any = { layout: layout as any, config: nextConfig as any };
        if (typeof item.position === 'number') updatePayload.position = item.position;
        if (typeof item.title === 'string' && item.title.length > 0) updatePayload.title = item.title;
        const { error: upErr } = await supabase.from('dashboard_widgets').update(updatePayload).eq('id', ex.id);
        if (upErr) errors.push(`${type}: ${upErr.message}`);
      } else {
        const def = FROTA_DEFAULT_WIDGETS.find((d) => d.type === type);
        const blockId = await ensureDefaultBlockId(id!);
        const { error: insErr } = await supabase.from('dashboard_widgets').insert({
          dashboard_id: id!, block_id: blockId, type,
          title: item.title ?? def?.title ?? type,
          position: item.position ?? def?.position ?? 99,
          layout: layout as any, config: nextConfig as any,
        });
        if (insErr) errors.push(`${type} (insert): ${insErr.message}`);
      }
    }
    if (errors.length > 0) throw new Error(errors.length === 1 ? errors[0] : `Falha em ${errors.length} bloco(s): ${errors[0]}`);
    await load();
  }, [load]);

  const resetLayout = useCallback(async () => {
    const { data: dashId } = await (supabase.rpc as any)('upsert_frota_dashboard_default');
    const id = dashId as string;
    if (!id) return;
    await supabase.from('dashboard_widgets').delete().eq('dashboard_id', id);
    await (supabase.rpc as any)('upsert_frota_dashboard_default');
    await load();
  }, [load]);

  const deleteWidget = useCallback(async (widgetId: string) => {
    const { error } = await supabase.from('dashboard_widgets').delete().eq('id', widgetId);
    if (error) throw error;
    await load();
  }, [load]);

  return { widgets, dashboardId, loading, canEdit, saveLayout, resetLayout, deleteWidget, reload: load };
}
