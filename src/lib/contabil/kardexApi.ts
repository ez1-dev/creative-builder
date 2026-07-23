// Cliente da API de Kardex (ficha de estoque por produto).
import { contabilApi, buildContabilRequest } from './contabilApi';

export interface KardexSaldo {
  quantidade: number;
  valor: number;
  custo_medio?: number;
}

export interface KardexResumo {
  entradas_qtd: number;
  saidas_qtd: number;
  entradas_valor: number;
  saidas_valor: number;
  transferencias_qtd?: number;
  transferencias_valor?: number;
  giro?: number;
  estoque_medio?: number;
}

export interface KardexContaContabil {
  ctared: number | string;
  clacta: string;
  descricao: string;
}

export interface KardexProduto {
  codpro: string;
  descricao: string;
  unidade?: string;
  origem?: string;
  familia?: string;
  conta_contabil?: KardexContaContabil | null;
}

export type KardexTipo = 'entrada' | 'saida' | 'transferencia' | string;

export interface KardexMovimento {
  data: string;
  deposito?: string | null;
  transacao?: string | number | null;
  transacao_desc?: string | null;
  lote?: string | number | null;
  tipo: KardexTipo;
  qtd_anterior: number;
  qtd_movimento: number;
  qtd_saldo: number;
  valor_anterior: number;
  valor_movimento: number;
  valor_saldo: number;
  custo_medio_saldo?: number;
}

export interface KardexResponse {
  produto: KardexProduto;
  saldo_inicial: KardexSaldo;
  saldo_final: KardexSaldo;
  resumo: KardexResumo;
  total_movimentos: number;
  movimentos: KardexMovimento[];
}

export interface KardexParams {
  codpro: string;
  data_ini: string; // AAAA-MM-DD
  data_fim: string;
  codemp?: number | string;
  codfil?: number | string;
  codder?: number | string;
  coddep?: number | string;
  limite?: number;
}

export function fetchKardex(params: KardexParams): Promise<KardexResponse> {
  return contabilApi.get<KardexResponse>('/api/contabil/estoque/kardex', {
    codemp: 1,
    ...params,
  }, { timeoutMs: 30000 });
}

export async function downloadKardexExcel(params: KardexParams): Promise<void> {
  const codemp = params.codemp ?? 1;
  const { url, headers } = buildContabilRequest(
    '/api/contabil/estoque/kardex/exportar',
    { codemp, ...params },
  );
  const resp = await fetch(url, { method: 'GET', headers });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(txt || `Falha ao exportar Kardex (HTTP ${resp.status}).`);
  }
  const blob = await resp.blob();
  const disp = resp.headers.get('Content-Disposition') || '';
  const m = disp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = (m?.[1]?.replace(/['"]/g, '') || `kardex_${params.codpro}.xlsx`);
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
