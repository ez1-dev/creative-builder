import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PassagensWidget {
  id: string;
  type: string;
  title: string;
  position: number;
  layout: WidgetLayout;
  hidden?: boolean;
}

/**
 * Lista canônica dos blocos do dashboard de Passagens Aéreas.
 * - kpis-row: linha com os 4 cards de KPI
 * - charts-row: gráficos (evolução mensal, motivo, top centros de custo, top destinos/UF)
 * - tabela-registros: tabela completa de registros + filtros + export
 */
export const PASSAGENS_DEFAULT_WIDGETS: PassagensWidget[] = [
  { id: 'kpis-row',              type: 'kpis-row',              title: 'KPIs',                   position: 0, layout: { x: 0, y: 0,  w: 12, h: 3  } },
  { id: 'chart-evolucao-mensal', type: 'chart-evolucao-mensal', title: 'Evolução Mensal',        position: 1, layout: { x: 0, y: 3,  w: 6,  h: 8  } },
  { id: 'chart-motivo-viagem',   type: 'chart-motivo-viagem',   title: 'Por Motivo de Viagem',   position: 2, layout: { x: 6, y: 3,  w: 6,  h: 8  } },
  { id: 'chart-top-cc',          type: 'chart-top-cc',          title: 'Top Centros de Custo',   position: 3, layout: { x: 0, y: 11, w: 12, h: 8  } },
  { id: 'chart-top-cidades',     type: 'chart-top-cidades',     title: 'Top Cidades de Destino', position: 4, layout: { x: 0, y: 19, w: 6,  h: 8  } },
  { id: 'chart-top-uf',          type: 'chart-top-uf',          title: 'Top Estados (UF)',       position: 5, layout: { x: 6, y: 19, w: 6,  h: 8  } },
  { id: 'tabela-registros',      type: 'tabela-registros',      title: 'Registros',              position: 6, layout: { x: 0, y: 27, w: 12, h: 10 } },
];

interface Options {
  /** Token público quando estamos na página /compartilhado. */
  shareToken?: string | null;
  /** Habilitado por padrão. Coloque false para evitar fetch (ex: skeleton). */
  enabled?: boolean;
}

/**
 * Hook que carrega o layout do dashboard de Passagens Aéreas.
 *
 * - Autenticado: lê direto de `dashboards` + `dashboard_widgets`.
 * - Público (shareToken): lê via RPC `get_passagens_layout_via_token`.
 *
 * Sempre retorna os 8 blocos canônicos: se algum não estiver no banco,
 * complementa com o default. Garante ordem estável por `position`.
 */
export function usePassagensLayout({ shareToken, enabled = true }: Options = {}) {
  const [widgets, setWidgets] = useState<PassagensWidget[]>(PASSAGENS_DEFAULT_WIDGETS);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const mergeWithDefaults = useCallback((rows: PassagensWidget[]): PassagensWidget[] => {
    const byType = new Map(rows.map((r) => [r.type, r]));
    return PASSAGENS_DEFAULT_WIDGETS.map((d) => byType.get(d.type) ?? d).sort(
      (a, b) => a.position - b.position,
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (shareToken) {
        // Via link público (anônimo)
        const { data, error } = await supabase.rpc('get_passagens_layout_via_token', {
          _token: shareToken,
        });
        if (error) {
          setWidgets(PASSAGENS_DEFAULT_WIDGETS);
          return;
        }
        const rows = (data ?? []).map((r: any) => ({
          id: r.widget_id,
          type: r.widget_type,
          title: r.widget_title,
          position: r.widget_position ?? 0,
          layout: (r.widget_layout ?? {}) as WidgetLayout,
          hidden: Boolean((r.widget_config ?? {})?.hidden),
        }));
        setWidgets(mergeWithDefaults(rows));
      } else {
        // Autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: adminCheck } = await supabase.rpc('is_admin', { _uid: user.id });
          setIsAdmin(Boolean(adminCheck));
        }
        const { data: dash } = await supabase
          .from('dashboards')
          .select('id')
          .eq('module', 'passagens-aereas')
          .is('owner_id', null)
          .eq('is_default', true)
          .maybeSingle();

        if (!dash) {
          setDashboardId(null);
          setWidgets(PASSAGENS_DEFAULT_WIDGETS);
          return;
        }
        setDashboardId(dash.id);
        const { data: rows } = await supabase
          .from('dashboard_widgets')
          .select('id, type, title, position, layout, config')
          .eq('dashboard_id', dash.id)
          .order('position');
        const mapped: PassagensWidget[] = (rows ?? []).map((r: any) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          position: r.position ?? 0,
          layout: (r.layout ?? {}) as WidgetLayout,
          hidden: Boolean((r.config ?? {})?.hidden),
        }));
        setWidgets(mergeWithDefaults(mapped));
      }
    } finally {
      setLoading(false);
    }
  }, [shareToken, mergeWithDefaults]);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  /**
   * Persiste o layout. Cria a linha default no banco se necessário (chamando
   * a RPC `upsert_passagens_dashboard_default`) e depois faz upsert dos
   * widgets com seus novos x/y/w/h.
   */
  const saveLayout = useCallback(
    async (next: { type: string; layout: WidgetLayout; hidden?: boolean }[]) => {
      // Garante que existe a linha default + widgets
      const { data: dashId, error: rpcError } = await supabase.rpc(
        'upsert_passagens_dashboard_default',
      );
      if (rpcError) throw rpcError;
      const id = dashId as string;
      setDashboardId(id);

      // Busca widgets atuais para mapear type -> {id, config}
      const { data: existing } = await supabase
        .from('dashboard_widgets')
        .select('id, type, config')
        .eq('dashboard_id', id);
      const byType = new Map<string, { id: string; config: any }>(
        (existing ?? []).map((r: any) => [r.type, { id: r.id, config: r.config ?? {} }]),
      );

      // Atualiza um a um (são poucos)
      await Promise.all(
        next.map(async ({ type, layout, hidden }) => {
          const ex = byType.get(type);
          if (!ex) return;
          const nextConfig = { ...(ex.config ?? {}), hidden: Boolean(hidden) };
          await supabase
            .from('dashboard_widgets')
            .update({ layout: layout as any, config: nextConfig as any })
            .eq('id', ex.id);
        }),
      );

      await load();
    },
    [load],
  );

  /** Reset: apaga widgets do dashboard default e recria via RPC. */
  const resetLayout = useCallback(async () => {
    const { data: dashId } = await supabase.rpc('upsert_passagens_dashboard_default');
    const id = dashId as string;
    if (!id) return;
    await supabase.from('dashboard_widgets').delete().eq('dashboard_id', id);
    await supabase.rpc('upsert_passagens_dashboard_default');
    await load();
  }, [load]);

  return { widgets, dashboardId, loading, isAdmin, saveLayout, resetLayout, reload: load };
}
