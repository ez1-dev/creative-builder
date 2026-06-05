import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';

export type AiTipoGrafico = 'donut' | 'pie' | 'bar' | 'line';
export type AiMetrica =
  | 'faturamento' | 'faturamento_liquido' | 'impostos' | 'devolucao'
  | 'quantidade' | 'clientes' | 'vendas' | 'ticket_medio' | 'preco_medio';
export type AiDimensao =
  | 'anomes_emissao' | 'unidade_negocio' | 'cd_origem' | 'cd_tp_movimento'
  | 'cd_estado' | 'cd_cliente' | 'cd_prj' | 'cd_rev_pedido' | 'cd_tns'
  | 'categoria_custom';

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

export interface AiChartDiagnostico {
  linhas_view?: number;
  linhas_filtradas?: number;
  qtd_categorias?: number;
  filtros_aplicados?: Record<string, string>;
  unidade_negocio?: string;
  periodo?: { ini?: string; fim?: string };
  dimensao?: string;
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
  mostrar_valor?: boolean;
  diagnostico?: AiChartDiagnostico;
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
 * Etapa 2 (FastAPI): a FastAPI agora recebe o prompt original + filtros base
 * (anomes_ini, anomes_fim, unidade_negocio, ...) e faz a interpretação/validação
 * no backend, devolvendo as séries prontas.
 */
export async function executarGraficoIA(
  prompt: string,
  filtrosBase: Record<string, any>,
): Promise<AiChartResult> {
  const body: Record<string, any> = { prompt };
  for (const [k, v] of Object.entries(filtrosBase ?? {})) {
    if (v != null && String(v).length > 0) body[k] = String(v);
  }

  // Fallback obrigatório de período: garante que anomes_ini/anomes_fim
  // sempre cheguem ao backend (FastAPI exige para filtrar a view).
  const aniRaw = (filtrosBase as any)?.anomes_ini;
  const afiRaw = (filtrosBase as any)?.anomes_fim;
  body.anomes_ini = aniRaw != null && String(aniRaw).length > 0 ? String(aniRaw) : '202601';
  body.anomes_fim = afiRaw != null && String(afiRaw).length > 0 ? String(afiRaw) : '202606';

  // Defesa em profundidade: se o prompt pediu "total/consolidado/geral" e NÃO mencionou
  // unidade específica, força CONSOLIDADO mesmo que o filtro global do dashboard esteja
  // em GENIUS/ESTRUTURAL. O backend interpreta CONSOLIDADO como "sem filtro de unidade".
  const p = String(prompt ?? '').toLowerCase();
  const mencionaTotal = /\b(total|consolidad[oa]|geral)\b/.test(p);
  const mencionaGenius = /\bgenius\b/.test(p);
  const mencionaEstrutural = /\b(estrutural|zortea)\b/.test(p);
  if (mencionaTotal && !mencionaGenius && !mencionaEstrutural) {
    body.unidade_negocio = 'CONSOLIDADO';
  } else if (mencionaGenius) {
    body.unidade_negocio = 'GENIUS';
  } else if (mencionaEstrutural) {
    body.unidade_negocio = 'ESTRUTURAL ZORTEA';
  } else if (!body.unidade_negocio) {
    body.unidade_negocio = 'CONSOLIDADO';
  }

  return api.post<AiChartResult>('/api/bi/comercial/ia-grafico', body);
}

/**
 * Composição pública usada pelo componente.
 * Envia direto ao FastAPI (prompt + filtros). A interpretação ocorre no backend.
 */
export async function gerarGraficoIA(
  prompt: string,
  filtrosBase: Record<string, any>,
): Promise<AiChartResult> {
  return executarGraficoIA(prompt, filtrosBase);
}
