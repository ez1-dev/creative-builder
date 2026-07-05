/**
 * Client do endpoint de IA de Compras.
 * POST /api/compras/ia-grafico
 * Contrato de resposta idêntico ao BI Comercial.
 */
import { api } from '@/lib/api';

export type ComprasIaTipo = 'bar' | 'line' | 'pie' | 'donut';
export type ComprasIaMetrica = 'comprado' | 'pendente' | 'recebido' | 'qtd_ocs' | 'qtd_itens';
export type ComprasIaDimensao =
  | 'fornecedor' | 'projeto' | 'centro_custo' | 'mes'
  | 'oc' | 'item' | 'familia' | 'origem';

export interface ComprasIaSerie {
  label: string;
  valor: number;
  percentual?: number;
  filtros_drill?: Record<string, any> | null;
}

export interface ComprasIaDiagnostico {
  linhas_view?: number;
  linhas_filtradas?: number;
  qtd_categorias?: number;
  filtros_aplicados?: Record<string, any>;
  periodo?: { ini?: string; fim?: string };
  dimensao?: string;
}

export interface ComprasIaChartResult {
  titulo: string;
  subtitulo?: string;
  tipo_grafico: ComprasIaTipo;
  metrica: ComprasIaMetrica;
  dimensao: ComprasIaDimensao;
  total: number;
  series: ComprasIaSerie[];
  filtros?: Record<string, any>;
  diagnostico?: ComprasIaDiagnostico;
}

/** Filtros do painel enviados ao backend. Só envia campos preenchidos e diferentes de "TODOS". */
export function sanitizeFiltrosCompras(filtros: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  const keep = [
    'fornecedor','numero_projeto','centro_custo','transacao','tipo_item','tipo_oc',
    'tipo_despesa','projeto_macro','data_emissao_ini','data_emissao_fim',
    'data_entrega_ini','data_entrega_fim','mes_competencia','condicao_pagamento',
    'somente_pendentes','origem_material','familia','coddep','codigo_motivo_oc',
    'observacao_oc','codigo_item','descricao_item','numero_oc','valor_min','valor_max',
  ];
  for (const k of keep) {
    const v = (filtros ?? {})[k];
    if (v == null) continue;
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s || s === 'TODOS') continue;
      out[k] = s;
    } else if (typeof v === 'boolean') {
      if (v) out[k] = true;
    } else if (Array.isArray(v)) {
      if (v.length) out[k] = v.join(',');
    } else {
      out[k] = v;
    }
  }
  const sit = (filtros ?? {}).situacao_oc;
  if (Array.isArray(sit) && sit.length) out.situacao_oc = sit.join(',');
  return out;
}

export async function gerarGraficoIACompras(
  prompt: string,
  filtrosPainel: Record<string, any>,
): Promise<ComprasIaChartResult> {
  const filtros = sanitizeFiltrosCompras(filtrosPainel);
  return api.post<ComprasIaChartResult>('/api/compras/ia-grafico', { prompt, filtros });
}
