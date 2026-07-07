import { supabase } from '@/integrations/supabase/client';
import type {
  TelemetriaOrigem, TelemetriaResumo, TelemetriaRankingRow,
  TelemetriaPorDiaRow, TelemetriaNaoUtilizadaRow,
} from '@/lib/navegacaoTelemetriaApi';

export interface AnaliseIaResultado {
  diagnostico: string[];
  riscos: string[];
  recomendacoes: string[];
  gerado_em: string;
}

interface Params {
  origem: TelemetriaOrigem;
  filtros: { dias: number; modulo: string; usuario_filtro: string };
  resumo: TelemetriaResumo | null;
  porDia: TelemetriaPorDiaRow[];
  ranking: TelemetriaRankingRow[];
  naoUtilizadas: TelemetriaNaoUtilizadaRow[];
}

export async function gerarAnaliseMonitorTelas(p: Params): Promise<AnaliseIaResultado> {
  const ordenado = [...p.ranking].sort((a, b) => (b.acessos ?? 0) - (a.acessos ?? 0));
  const ranking_top = ordenado.slice(0, 25);
  const ranking_bottom = ordenado.slice(-10);
  const nao_utilizadas = [...p.naoUtilizadas]
    .sort((a, b) => (b.dias_sem_uso ?? 0) - (a.dias_sem_uso ?? 0))
    .slice(0, 25);

  const body = {
    origem: p.origem,
    filtros: p.filtros,
    payload: {
      resumo: p.resumo,
      por_dia: p.porDia,
      ranking_top,
      ranking_bottom,
      nao_utilizadas,
    },
  };

  const { data, error } = await supabase.functions.invoke('monitor-telas-ia', { body });
  if (error) throw new Error(error.message || 'Falha ao chamar IA');
  if (data?.error) throw new Error(String(data.error));
  return data as AnaliseIaResultado;
}
