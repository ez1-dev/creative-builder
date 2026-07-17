import { api } from '@/lib/api';

export type ProducaoResumo = {
  kg_produzido?: number | null;
  kg_expedido?: number | null;
  kg_patio?: number | null;
  kg_engenharia?: number | null;
  itens_nao_carregados?: number | null;
  leadtime_medio_total?: number | null;
  leadtime_medio_engenharia?: number | null;
  leadtime_medio_producao?: number | null;
  leadtime_medio_engenharia_producao?: number | null;
  leadtime_medio_producao_expedicao?: number | null;
  quantidade_cargas?: number | null;
  projetos_aguardando_producao?: number | null;
  projetos_em_producao?: number | null;
  projetos_parcialmente_expedidos?: number | null;
  projetos_expedidos?: number | null;
  [k: string]: any;
};

export type CargaResumo = {
  ocupacao_media_percentual?: number | null;
  qtd_gargalos?: number | null;
  obras_em_producao?: number | null;
  [k: string]: any;
};

export type ProducaoVisaoGeralResponse = {
  producao?: ProducaoResumo;
  top_projetos_patio?: Array<Record<string, any>>;
  cargas_por_mes?: Array<Record<string, any>>;
  carga?: CargaResumo | null;
};

export type ProducaoFiltros = {
  numero_projeto?: string;
  numero_desenho?: string;
  revisao?: string;
  cliente?: string;
  cidade?: string;
  obra?: string;
  data_ini?: string;
  data_fim?: string;
  situacoes?: string;
  unidade_negocio?: string;
  tipo_recurso?: string;
};

function buildParams(f: ProducaoFiltros, incluirCarga: boolean): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s === '') continue;
    params[k] = s;
  }
  if (incluirCarga) params.incluir_carga = 'true';
  return params;
}

/**
 * GET /api/producao/visao-geral (novo agregador).
 * Durante a transição, se retornar 404, cai para /api/producao/dashboard.
 * Só faz fallback em 404. Outros erros são propagados.
 */
export async function fetchProducaoVisaoGeral(
  f: ProducaoFiltros,
  incluirCarga: boolean,
): Promise<ProducaoVisaoGeralResponse> {
  try {
    return await api.get<ProducaoVisaoGeralResponse>(
      '/api/producao/visao-geral',
      buildParams(f, incluirCarga),
    );
  } catch (e: any) {
    if (e?.statusCode === 404) {
      // eslint-disable-next-line no-console
      console.warn(
        '[producao] /api/producao/visao-geral ainda não publicado — usando fallback /api/producao/dashboard.',
      );
      const legacy = await api.get<any>('/api/producao/dashboard', buildParams(f, false));
      return {
        producao: (legacy?.resumo ?? undefined) as ProducaoResumo | undefined,
        top_projetos_patio: Array.isArray(legacy?.top_projetos_patio)
          ? legacy.top_projetos_patio
          : [],
        cargas_por_mes: Array.isArray(legacy?.cargas_por_mes) ? legacy.cargas_por_mes : [],
        carga: null,
      };
    }
    throw e;
  }
}
