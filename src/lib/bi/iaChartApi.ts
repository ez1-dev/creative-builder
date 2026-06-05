import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';

export type AiTipoGrafico = 'donut' | 'pie' | 'bar' | 'line';
export type AiMetrica =
  | 'faturamento' | 'faturamento_liquido' | 'impostos' | 'devolucao'
  | 'quantidade' | 'clientes' | 'vendas' | 'ticket_medio' | 'preco_medio';
export type AiDimensao =
  | 'anomes_emissao' | 'unidade_negocio' | 'cd_origem' | 'cd_tp_movimento'
  | 'cd_estado' | 'cd_cliente' | 'cd_prj' | 'cd_rev_pedido' | 'cd_tns';

export interface IAChartSpec {
  titulo: string;
  subtitulo: string;
  tipo_grafico: AiTipoGrafico;
  metrica: AiMetrica;
  dimensao: AiDimensao;
  filtros: Record<string, string>;
  top_n: number;
  mostrar_percentual: boolean;
}

export interface AiChartSerie {
  label: string;
  valor: number;
  percentual: number;
  filtros_drill?: Record<string, string> | null;
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
  mostrar_percentual?: boolean;
}

/**
 * Etapa 1 (Cloud/Lovable AI): interpreta o prompt e devolve um spec estruturado.
 * Nunca consulta dados. Nunca gera SQL.
 */
export async function interpretarGraficoIA(
  prompt: string,
  filtrosBase: Record<string, any>,
): Promise<IAChartSpec> {
  const filtros: Record<string, string> = {};
  Object.entries(filtrosBase ?? {}).forEach(([k, v]) => {
    if (v != null && String(v).length > 0) filtros[k] = String(v);
  });
  const { data, error } = await supabase.functions.invoke('bi-ia-chart', {
    body: { prompt, filtros_base: filtros },
  });
  if (error) throw new Error(error.message ?? 'Erro ao interpretar prompt');
  const payload = data as any;
  if (payload?.error) {
    const err = new Error(payload.error) as Error & { code?: string };
    err.code = payload.code;
    throw err;
  }
  return data as IAChartSpec;
}

/**
 * Etapa 2 (FastAPI): executa o spec, calcula séries a partir da base segura no ERP.
 */
export async function executarGraficoIA(spec: IAChartSpec): Promise<AiChartResult> {
  return api.post<AiChartResult>('/api/bi/comercial/ia-grafico', spec);
}

/**
 * Composição: interpretar → executar. Mantém a assinatura pública usada pelo componente.
 */
export async function gerarGraficoIA(
  prompt: string,
  filtrosBase: Record<string, any>,
): Promise<AiChartResult> {
  const spec = await interpretarGraficoIA(prompt, filtrosBase);
  return executarGraficoIA(spec);
}
