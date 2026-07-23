// Cliente da API de Conciliação Estoque × Contábil (regra 81 do relatório 512).
import { contabilApi, buildContabilRequest } from './contabilApi';

export interface ConciliacaoEstoqueConta {
  ctared: number | string;
  clacta: string;
  descricao: string;
  saldo_estoque: number;
  saldo_contabil: number;
  diferenca: number;
  ok: boolean;
}

export interface ConciliacaoEstoqueTotais {
  saldo_estoque: number;
  saldo_contabil: number;
  diferenca: number;
}

export interface ConciliacaoEstoqueResumo {
  contas_analisadas: number;
  contas_divergentes: number;
  conciliado: boolean;
}

export interface ConciliacaoEstoqueResponse {
  data_corte: string;
  clacta_filtro?: string | null;
  totais: ConciliacaoEstoqueTotais;
  resumo: ConciliacaoEstoqueResumo;
  contas: ConciliacaoEstoqueConta[];
}

export interface ConciliacaoEstoqueParams {
  data_fim: string; // AAAA-MM-DD
  codemp?: number | string;
  codfil?: number | string;
  clacta?: string | number;
  tolerancia?: number;
  somente_divergencias?: boolean;
}

export function fetchConciliacaoEstoque(
  params: ConciliacaoEstoqueParams,
): Promise<ConciliacaoEstoqueResponse> {
  return contabilApi.get<ConciliacaoEstoqueResponse>(
    '/api/contabil/estoque/conciliacao',
    { codemp: 1, ...params },
    { timeoutMs: 60000 },
  );
}

/** Baixa a planilha XLSX da conciliação via fetch autenticado (Bearer). */
export async function downloadConciliacaoEstoqueExcel(
  params: ConciliacaoEstoqueParams,
): Promise<void> {
  const codemp = params.codemp ?? 1;
  const { url, headers } = buildContabilRequest(
    '/api/contabil/estoque/conciliacao/exportar',
    { codemp, ...params },
  );
  const resp = await fetch(url, { method: 'GET', headers });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(txt || `Falha ao exportar conciliação (HTTP ${resp.status}).`);
  }
  const blob = await resp.blob();
  const disp = resp.headers.get('Content-Disposition') || '';
  const m = disp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename =
    m?.[1]?.replace(/['"]/g, '') || `conciliacao_estoque_${params.data_fim}.xlsx`;
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
