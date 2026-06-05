import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureDefaultBlockId } from '@/lib/bi/ensureDefaultBlock';
import { useDashboardBlocks } from '@/hooks/useDashboardBlocks';

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
  /** Bloco ao qual o componente pertence. Obrigatório no banco; em widgets pendentes pode ficar
   *  ausente até o salvamento, quando é resolvido para o bloco padrão. */
  blockId?: string | null;
  /** Quando definido, sobrescreve o renderizador canônico pelo componente do COMPONENT_REGISTRY. */
  componentId?: string;
  /** Mapeamento de inputs -> chaves do PageDataContext (ex.: { series: 'evolucao_mensal' }). */
  mapping?: Record<string, string>;
  /** Opções extras do componente (ex.: topN do ranking). */
  options?: Record<string, any>;
  /** Título customizado (sobrescreve `title`). */
  customTitle?: string;
}

export interface SaveLayoutItem {
  type: string;
  layout: WidgetLayout;
  hidden?: boolean;
  /** null limpa o override; undefined = não mexe. */
  componentId?: string | null;
  mapping?: Record<string, string> | null;
  options?: Record<string, any> | null;
  customTitle?: string | null;
  /** Para widgets novos (custom-*): título e position de criação. */
  title?: string;
  position?: number;
  /** Bloco onde o componente deve ser inserido (obrigatório para widgets novos). */
  blockId?: string | null;
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
  { id: 'chart-top-uf',              type: 'chart-top-uf',              title: 'Top Estados (UF)',       position: 5, layout: { x: 6, y: 19, w: 6,  h: 8  } },
  { id: 'chart-top-destinos-valor',  type: 'chart-top-destinos-valor',  title: 'Top Destinos por Valor', position: 6, layout: { x: 0, y: 27, w: 6,  h: 10 } },
  { id: 'tabela-registros',          type: 'tabela-registros',          title: 'Registros',              position: 7, layout: { x: 0, y: 37, w: 12, h: 10 } },
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
    // Inclui defaults faltantes + qualquer custom-* presente em rows
    const fromDefaults = PASSAGENS_DEFAULT_WIDGETS.map((d) => byType.get(d.type) ?? d);
    const customs = rows.filter((r) => !PASSAGENS_DEFAULT_WIDGETS.some((d) => d.type === r.type));
    return [...fromDefaults, ...customs].sort((a, b) => a.position - b.position);
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
        const rows = (data ?? []).map((r: any) => {
          const cfg = (r.widget_config ?? {}) as any;
          return {
            id: r.widget_id,
            type: r.widget_type,
            title: r.widget_title,
            position: r.widget_position ?? 0,
            layout: (r.widget_layout ?? {}) as WidgetLayout,
            hidden: Boolean(cfg.hidden),
            blockId: r.widget_block_id ?? null,
            componentId: cfg.componentId,
            mapping: cfg.mapping,
            options: cfg.options,
            customTitle: cfg.customTitle,
          } as PassagensWidget;
        });
        setWidgets(mergeWithDefaults(rows));
      } else {
        // Autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: editCheck } = await supabase.rpc('can_edit_passagens', { _uid: user.id });
          setIsAdmin(Boolean(editCheck));
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
        const mapped: PassagensWidget[] = (rows ?? []).map((r: any) => {
          const cfg = (r.config ?? {}) as any;
          return {
            id: r.id,
            type: r.type,
            title: r.title,
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
    async (next: SaveLayoutItem[]) => {
      // 1) Localiza ou cria o dashboard default
      let id: string | null = null;
      const { data: dash } = await supabase
        .from('dashboards')
        .select('id')
        .eq('module', 'passagens-aereas')
        .is('owner_id', null)
        .eq('is_default', true)
        .maybeSingle();
      if (dash?.id) {
        id = dash.id;
      } else {
        const { data: dashId, error: rpcError } = await supabase.rpc(
          'upsert_passagens_dashboard_default',
        );
        if (rpcError) throw rpcError;
        id = dashId as string;
      }
      setDashboardId(id);

      // 2) Busca widgets atuais para mapear type -> {id, config}
      const { data: existing, error: fetchErr } = await supabase
        .from('dashboard_widgets')
        .select('id, type, config')
        .eq('dashboard_id', id);
      if (fetchErr) throw fetchErr;
      const byType = new Map<string, { id: string; config: any }>(
        (existing ?? []).map((r: any) => [r.type, { id: r.id, config: r.config ?? {} }]),
      );

      // helper para mesclar mudanças no JSONB config
      const mergeConfig = (
        prev: any,
        item: SaveLayoutItem,
      ): Record<string, any> => {
        const cfg: Record<string, any> = { ...(prev ?? {}) };
        cfg.hidden = Boolean(item.hidden);
        if (item.componentId !== undefined) {
          if (item.componentId === null) delete cfg.componentId;
          else cfg.componentId = item.componentId;
        }
        if (item.mapping !== undefined) {
          if (item.mapping === null) delete cfg.mapping;
          else cfg.mapping = item.mapping;
        }
        if (item.options !== undefined) {
          if (item.options === null) delete cfg.options;
          else cfg.options = item.options;
        }
        if (item.customTitle !== undefined) {
          if (item.customTitle === null || item.customTitle === '') delete cfg.customTitle;
          else cfg.customTitle = item.customTitle;
        }
        return cfg;
      };

      // 3) Update (ou insert quando não existir) — sequencial para coletar erros
      const errors: string[] = [];
      let untouched = 0;
      let saved = 0;
      // eslint-disable-next-line no-console
      console.debug('[usePassagensLayout] saveLayout payload', { dashboardId: id, count: next.length, items: next });
      for (const item of next) {
        const { type, layout } = item;
        const ex = byType.get(type);
        const nextConfig = mergeConfig(ex?.config, item);
        if (ex) {
          const updatePayload: any = { layout: layout as any, config: nextConfig as any };
          if (typeof item.position === 'number') updatePayload.position = item.position;
          if (typeof item.title === 'string' && item.title.length > 0) updatePayload.title = item.title;
          const { data: updated, error: upErr } = await supabase
            .from('dashboard_widgets')
            .update(updatePayload)
            .eq('id', ex.id)
            .select('id');
          if (upErr) {
            errors.push(`${type}: ${upErr.message}`);
            // eslint-disable-next-line no-console
            console.error('[usePassagensLayout] update err', type, upErr);
          } else if (!updated || updated.length === 0) {
            untouched += 1;
            errors.push(`${type}: nenhuma linha atualizada (verifique permissões)`);
            // eslint-disable-next-line no-console
            console.warn('[usePassagensLayout] update 0 rows', type, { id: ex.id, layout, nextConfig });
          } else {
            saved += 1;
          }
        } else {
          // Widget ainda não existe no banco — cria
          const def = PASSAGENS_DEFAULT_WIDGETS.find((d) => d.type === type);
          const blockId = await ensureDefaultBlockId(id!);
          const { error: insErr } = await supabase
            .from('dashboard_widgets')
            .insert({
              dashboard_id: id!,
              block_id: blockId,
              type,
              title: item.title ?? def?.title ?? type,
              position: item.position ?? def?.position ?? 99,
              layout: layout as any,
              config: nextConfig as any,
            });
          if (insErr) {
            errors.push(`${type} (insert): ${insErr.message}`);
            // eslint-disable-next-line no-console
            console.error('[usePassagensLayout] insert err', type, insErr);
          } else {
            saved += 1;
          }
        }
      }
      // eslint-disable-next-line no-console
      console.debug('[usePassagensLayout] saveLayout done', { saved, untouched, errors: errors.length });

      if (errors.length > 0) {
        // Loga detalhes para debug e lança erro consolidado para o componente
        // eslint-disable-next-line no-console
        console.error('[usePassagensLayout] saveLayout errors:', errors, { untouched });
        throw new Error(
          errors.length === 1
            ? errors[0]
            : `Falha ao salvar ${errors.length} bloco(s). Primeiro erro: ${errors[0]}`,
        );
      }

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

  /** Remove um widget custom-* do banco permanentemente. */
  const deleteWidget = useCallback(async (widgetId: string) => {
    const { error } = await supabase.from('dashboard_widgets').delete().eq('id', widgetId);
    if (error) throw error;
    await load();
  }, [load]);

  return { widgets, dashboardId, loading, isAdmin, saveLayout, resetLayout, deleteWidget, reload: load };
}
