/**
 * Hook que chama a edge function `dashboard-geral-insights` passando um
 * snapshot dos KPIs para gerar destaques priorizados via IA.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardGeralData } from './useDashboardGeral';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';

export interface InsightItem {
  severidade: 'critico' | 'atencao' | 'ok';
  titulo: string;
  descricao: string;
  rota?: string;
}

export interface InsightsResult {
  resumo: string;
  itens: InsightItem[];
}

export function useDashboardGeralInsights(data: DashboardGeralData, periodo: Periodo) {
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gerar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: resp, error: fnError } = await supabase.functions.invoke('dashboard-geral-insights', {
        body: { periodo, kpis: data.kpis, status: data.status },
      });
      if (fnError) throw new Error(fnError.message);
      if (!resp?.itens) throw new Error('Resposta inválida da função de insights.');
      setInsights(resp as InsightsResult);
    } catch (e: any) {
      setError(e?.message ?? 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [data, periodo]);

  return { insights, loading, error, gerar };
}
