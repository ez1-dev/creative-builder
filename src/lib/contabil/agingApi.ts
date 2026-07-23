// Cliente da API de Aging (títulos em aberto por faixa de atraso).
// Reusa o contabilApi (base + Bearer + ngrok header + timeouts).
import { contabilApi, buildContabilRequest } from './contabilApi';

export type AgingTipo = 'receber' | 'pagar' | 'ambos';

export type AgingFaixa =
  | 'a_vencer'
  | 'v_1_30'
  | 'v_31_60'
  | 'v_61_90'
  | 'v_90_mais';

export const AGING_FAIXAS: AgingFaixa[] = [
  'a_vencer',
  'v_1_30',
  'v_31_60',
  'v_61_90',
  'v_90_mais',
];

export const AGING_FAIXA_LABEL: Record<AgingFaixa, string> = {
  a_vencer: 'A vencer',
  v_1_30: '1 a 30 dias',
  v_31_60: '31 a 60 dias',
  v_61_90: '61 a 90 dias',
  v_90_mais: 'Acima de 90 dias',
};

export interface AgingTotais {
  a_vencer: number;
  v_1_30: number;
  v_31_60: number;
  v_61_90: number;
  v_90_mais: number;
  total: number;
}

export interface AgingParceiro extends AgingTotais {
  codigo: number | string;
  nome: string;
}

export interface AgingBloco {
  totais: AgingTotais;
  parceiros: AgingParceiro[];
}

export interface AgingResponse {
  data_base: string;
  faixas: AgingFaixa[];
  receber?: AgingBloco;
  pagar?: AgingBloco;
}

export interface AgingParams {
  tipo: AgingTipo;
  codemp?: number | string;
  codfil?: number | string;
  data_base?: string; // AAAA-MM-DD
  top?: number;
}

export function fetchAging(params: AgingParams): Promise<AgingResponse> {
  return contabilApi.get<AgingResponse>('/api/contabil/financeiro/aging', {
    codemp: 1,
    ...params,
  });
}

/** Baixa a planilha XLSX do Aging via fetch autenticado (Bearer). */
export async function downloadAgingExcel(params: AgingParams): Promise<void> {
  const codemp = params.codemp ?? 1;
  const { url, headers } = buildContabilRequest(
    '/api/contabil/financeiro/aging/exportar',
    { codemp, ...params },
  );
  const resp = await fetch(url, { method: 'GET', headers });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(txt || `Falha ao exportar Aging (HTTP ${resp.status}).`);
  }
  const blob = await resp.blob();
  const disp = resp.headers.get('Content-Disposition') || '';
  const m = disp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = (m?.[1]?.replace(/['"]/g, '') || `aging_${params.tipo}_${codemp}.xlsx`);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
