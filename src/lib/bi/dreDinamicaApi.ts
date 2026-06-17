import { api, getApiUrl } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

export type DreDinamicaTipoLinha = 'TITULO' | 'ANALITICA' | 'AGRUPADORA' | 'TOTAL' | 'CALCULO';

export interface DreDinamicaLinha {
  modelo_id: string | null;
  codigo_linha: string;
  descricao: string;
  ordem: number;
  nivel: number;
  tipo_linha: DreDinamicaTipoLinha;
  formula: string | null;
  realizado: number;
  flag_negrito?: boolean;
  flag_permite_drill?: boolean;
}

export interface DreDinamicaResponse {
  anomes_ini: string;
  anomes_fim: string;
  modelo_id: string | null;
  dados: DreDinamicaLinha[];
}

export interface DreDinamicaFiltros {
  ano: number;
  mes_ini: number;
  mes_fim: number;
  modelo_id?: string | null;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function montarAnomes(ano: number, mes: number): string {
  return `${ano}${pad2(mes)}`;
}

function authHeaders(): Record<string, string> {
  const token = api.getToken();
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchDreDinamica(filtros: DreDinamicaFiltros): Promise<DreDinamicaResponse> {
  const anomes_ini = montarAnomes(filtros.ano, filtros.mes_ini);
  const anomes_fim = montarAnomes(filtros.ano, filtros.mes_fim);

  const qs = new URLSearchParams({ anomes_ini, anomes_fim });
  if (filtros.modelo_id) qs.set('modelo_id', filtros.modelo_id);

  const url = `${getApiUrl()}/api/bi/contabilidade/dre-dinamica?${qs.toString()}`;

  console.log('[DRE DINAMICA] filtros:', { ...filtros, anomes_ini, anomes_fim });
  console.log('[DRE DINAMICA] url:', url);

  const resp = await fetch(url, { method: 'GET', headers: authHeaders() });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`DRE Dinâmica indisponível (HTTP ${resp.status}): ${txt.slice(0, 300)}`);
  }
  const data = (await resp.json().catch(() => ({}))) as Partial<DreDinamicaResponse>;
  console.log('[DRE DINAMICA] retorno:', data);

  return {
    anomes_ini: data.anomes_ini ?? anomes_ini,
    anomes_fim: data.anomes_fim ?? anomes_fim,
    modelo_id: data.modelo_id ?? filtros.modelo_id ?? null,
    dados: Array.isArray(data.dados) ? data.dados : [],
  };
}

// ---------- Plano de Contas via RPC ----------
export interface PlanoContasItem {
  cd_mascara: string;
  cd_conta_contabil: string;
  qtde: number;
  total: number;
}

export async function fetchPlanoContasDre(): Promise<PlanoContasItem[]> {
  const { data, error } = await (supabase as any).rpc('get_plano_contas_dre');
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    cd_mascara: r.cd_mascara ?? '',
    cd_conta_contabil: r.cd_conta_contabil ?? '',
    qtde: Number(r.qtde ?? 0),
    total: Number(r.total ?? 0),
  }));
}
