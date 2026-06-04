import { supabase } from '@/integrations/supabase/client';

export type AiTipoGrafico = 'donut' | 'pie' | 'bar' | 'line';
export type AiMetrica =
  | 'faturamento' | 'impostos' | 'devolucao' | 'custo'
  | 'quantidade' | 'numero_clientes' | 'numero_vendas';
export type AiDimensao =
  | 'unidade_negocio' | 'cd_origem' | 'cd_estado' | 'cd_cliente'
  | 'cd_tns' | 'cd_rev_pedido' | 'anomes_emissao';

export interface AiChartSerie {
  label: string;
  valor: number;
  percentual: number;
}

export interface AiChartResult {
  titulo: string;
  subtitulo: string;
  tipo_grafico: AiTipoGrafico;
  metrica: AiMetrica;
  dimensao: AiDimensao;
  total: number;
  series: AiChartSerie[];
  filtros: Record<string, string>;
}

export async function gerarGraficoIA(
  prompt: string,
  filtrosBase: Record<string, any>,
): Promise<AiChartResult> {
  const filtros: Record<string, string> = {};
  Object.entries(filtrosBase ?? {}).forEach(([k, v]) => {
    if (v != null && String(v).length > 0) filtros[k] = String(v);
  });
  const { data, error } = await supabase.functions.invoke('bi-ia-chart', {
    body: { prompt, filtros_base: filtros },
  });
  if (error) throw new Error(error.message ?? 'Erro ao gerar gráfico');
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as AiChartResult;
}
