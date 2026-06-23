// Client da API FastAPI para configuração da DRE Dinâmica.
// Endpoints:
//   GET  /api/bi/contabilidade/dre-dinamica/plano-contas
//   POST /api/bi/contabilidade/dre-dinamica/vincular-contas
import { api, getApiUrl } from '@/lib/api';

function authHeaders(): Record<string, string> {
  const token = api.getToken();
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export interface DreDinamicaPlanoContasItem {
  cd_mascara: string;
  cd_conta_contabil: string;
  ds_conta?: string | null;
  qtde?: number;
  total?: number;
}

export interface DreDinamicaPlanoContasFiltros {
  anomes_ini: string;
  anomes_fim: string;
  modelo_id: string;
  limit?: number;
}

export async function fetchDreDinamicaPlanoContas(
  filtros: DreDinamicaPlanoContasFiltros,
): Promise<DreDinamicaPlanoContasItem[]> {
  const qs = new URLSearchParams({
    anomes_ini: filtros.anomes_ini,
    anomes_fim: filtros.anomes_fim,
    modelo_id: filtros.modelo_id,
    limit: String(filtros.limit ?? 10000),
  });
  const url = `${getApiUrl()}/api/bi/contabilidade/dre-dinamica/plano-contas?${qs.toString()}`;
  console.log('[DRE DINAMICA CFG] GET plano-contas', url);
  const resp = await fetch(url, { method: 'GET', headers: authHeaders() });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Plano de contas indisponível (HTTP ${resp.status}): ${txt.slice(0, 300)}`);
  }
  const data = await resp.json().catch(() => ({}));
  const arr = Array.isArray(data?.dados) ? data.dados
    : Array.isArray(data?.itens) ? data.itens
    : Array.isArray(data) ? data : [];
  return arr.map((r: any) => ({
    cd_mascara: String(r?.cd_mascara ?? ''),
    cd_conta_contabil: String(r?.cd_conta_contabil ?? ''),
    ds_conta: r?.ds_conta ?? null,
    qtde: Number(r?.qtde ?? 0),
    total: Number(r?.total ?? 0),
  }));
}

export type DreDinamicaTipoRegra = 'MASCARA_CONTA' | 'CONTA_CONTABIL';
export type DreDinamicaOperador = 'COMECA_COM' | 'IGUAL' | 'LIKE' | 'IN';

export interface DreDinamicaVincularContaItem {
  cd_mascara?: string;
  cd_conta_contabil?: string;
}

export interface DreDinamicaVincularPayload {
  modelo_id: string;
  linha_id: string;
  tipo_regra: DreDinamicaTipoRegra;
  operador: DreDinamicaOperador;
  sinal: number;
  prioridade: number;
  contas: DreDinamicaVincularContaItem[];
}

export async function postDreDinamicaVincularContas(
  payload: DreDinamicaVincularPayload,
): Promise<{ ok: boolean; vinculadas: number; raw: any }> {
  const url = `${getApiUrl()}/api/bi/contabilidade/dre-dinamica/vincular-contas`;
  console.log('[DRE DINAMICA CFG] POST vincular-contas', payload);
  const resp = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Falha ao vincular contas (HTTP ${resp.status}): ${txt.slice(0, 300)}`);
  }
  const data = await resp.json().catch(() => ({}));
  return {
    ok: true,
    vinculadas: Number(data?.vinculadas ?? payload.contas.length),
    raw: data,
  };
}
