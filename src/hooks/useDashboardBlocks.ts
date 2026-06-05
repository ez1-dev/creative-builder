import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardBlock {
  id: string;
  dashboardId: string;
  title: string;
  ordem: number;
  cols: number;
  layout: Record<string, any>;
  config: Record<string, any>;
}

type Module = 'passagens-aereas' | 'frota' | 'manutencao-maquinas' | 'bi-comercial';

interface Options {
  /** ID do dashboard (autenticado). */
  dashboardId?: string | null;
  /** Token público — usado pelo módulo para chamar a RPC pública correta. */
  shareToken?: string | null;
  /** Módulo da página — necessário quando shareToken estiver presente. */
  module?: Module;
  /** Habilita o fetch. */
  enabled?: boolean;
}

const PUBLIC_RPC: Record<Module, string> = {
  'passagens-aereas': 'get_passagens_blocks_via_token',
  'frota': 'get_frota_blocks_via_token',
  'manutencao-maquinas': 'get_maquinas_blocks_via_token',
  'bi-comercial': 'get_passagens_blocks_via_token', // placeholder; BI comercial não usa share
};

/**
 * Carrega a lista de blocos do dashboard + helpers de CRUD.
 *
 * Garante sempre pelo menos um "Bloco Principal" (criado pelo banco quando há widgets).
 */
export function useDashboardBlocks({ dashboardId, shareToken, module, enabled = true }: Options) {
  const [blocks, setBlocks] = useState<DashboardBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (shareToken && module) {
        const rpc = PUBLIC_RPC[module];
        const { data, error } = await supabase.rpc(rpc as any, { _token: shareToken });
        if (error || !data) {
          setBlocks([]);
          return;
        }
        const rows = (data as any[]).map((r) => ({
          id: r.block_id,
          dashboardId: '',
          title: r.title ?? 'Bloco',
          ordem: r.ordem ?? 0,
          cols: r.cols ?? 12,
          layout: r.layout ?? {},
          config: r.config ?? {},
        }));
        setBlocks(rows.sort((a, b) => a.ordem - b.ordem));
      } else if (dashboardId) {
        const { data, error } = await supabase
          .from('dashboard_blocks')
          .select('id, dashboard_id, title, ordem, cols, layout, config')
          .eq('dashboard_id', dashboardId)
          .order('ordem');
        if (error || !data) {
          setBlocks([]);
          return;
        }
        setBlocks(
          data.map((r: any) => ({
            id: r.id,
            dashboardId: r.dashboard_id,
            title: r.title,
            ordem: r.ordem,
            cols: r.cols ?? 12,
            layout: r.layout ?? {},
            config: r.config ?? {},
          })),
        );
      } else {
        setBlocks([]);
      }
    } finally {
      setLoading(false);
    }
  }, [dashboardId, shareToken, module]);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  const createBlock = useCallback(
    async (title?: string) => {
      if (!dashboardId) throw new Error('Dashboard não disponível');
      const { data, error } = await supabase.rpc('create_dashboard_block', {
        _dashboard_id: dashboardId,
        _title: title ?? 'Novo Bloco',
      });
      if (error) throw error;
      await load();
      return data as string;
    },
    [dashboardId, load],
  );

  const renameBlock = useCallback(
    async (blockId: string, title: string) => {
      const { error } = await supabase.rpc('update_dashboard_block', {
        _block_id: blockId,
        _title: title,
      } as any);
      if (error) throw error;
      await load();
    },
    [load],
  );

  const reorderBlock = useCallback(
    async (blockId: string, ordem: number) => {
      const { error } = await supabase.rpc('update_dashboard_block', {
        _block_id: blockId,
        _ordem: ordem,
      } as any);
      if (error) throw error;
      await load();
    },
    [load],
  );

  const deleteBlock = useCallback(
    async (blockId: string, moveWidgetsTo?: string | null) => {
      const { error } = await supabase.rpc('delete_dashboard_block', {
        _block_id: blockId,
        _move_widgets_to: moveWidgetsTo ?? null,
      } as any);
      if (error) throw error;
      await load();
    },
    [load],
  );

  const moveWidgetToBlock = useCallback(
    async (widgetId: string, blockId: string) => {
      const { error } = await supabase.rpc('move_widget_to_block', {
        _widget_id: widgetId,
        _block_id: blockId,
      });
      if (error) throw error;
      await load();
    },
    [load],
  );

  return {
    blocks,
    loading,
    reload: load,
    createBlock,
    renameBlock,
    reorderBlock,
    deleteBlock,
    moveWidgetToBlock,
  };
}
