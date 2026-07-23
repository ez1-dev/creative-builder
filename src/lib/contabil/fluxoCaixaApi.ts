// Cliente da API de Fluxo de Caixa (Tesouraria).
// Três visões: Projeção, Realizado Direto, Realizado Indireto + IA (SSE) + Excel.
import { contabilApi, buildContabilRequest } from './contabilApi';

export interface ProjecaoParams {
  codemp?: number | string;
  codfil?: number | string;
  horizonte_dias?: number;
  granularidade?: 'mes' | 'semana';
  data_base?: string;         // AAAA-MM-DD
  saldo_inicial?: number;
}

export interface CurvaPonto {
  periodo: string;            // AAAA-MM ou AAAA-Www
  entradas: number;
  saidas: number;
  fluxo_liquido: number;
  saldo_projetado: number;
}

export interface ProjecaoResponse {
  data_base: string;
  saldo_inicial: number;
  saldo_inicial_fonte?: string;
  vencidos: { receber: number; pagar: number; liquido: number };
  curva: CurvaPonto[];
  resumo_horizonte?: {
    menor_saldo?: number;
    menor_saldo_em?: string;
    [k: string]: any;
  };
  alertas?: string[];
  [k: string]: any;
}

export interface RealizadoParams {
  anomes_ini: number | string;
  anomes_fim: number | string;
  codemp?: number | string;
  codfil?: number | string;
}

export type AtividadeFC = 'operacional' | 'investimento' | 'financiamento' | 'tesouraria';

export interface DiretoCategoria {
  categoria: string;
  atividade: AtividadeFC | string;
  entradas: number;
  saidas: number;
  liquido: number;
  obs?: string | null;
}

export interface DiretoResponse {
  caixa_inicial: number;
  caixa_final: number;
  categorias: DiretoCategoria[];
  total_entradas: number;
  total_saidas: number;
  variacao_liquida: number;
  variacao_real_caixa: number;
  residual_conciliacao: number;
  conciliado: boolean;
  [k: string]: any;
}

export interface IndiretoItem {
  descricao: string;
  valor: number;
}
export interface IndiretoAtividade {
  itens: IndiretoItem[];
  total: number;
}
export interface IndiretoResponse {
  caixa_inicial: number;
  caixa_final: number;
  atividades: {
    operacional: IndiretoAtividade;
    investimento: IndiretoAtividade;
    financiamento: IndiretoAtividade;
    [k: string]: IndiretoAtividade;
  };
  variacao_liquida_calculada: number;
  variacao_real_caixa: number;
  residual_conciliacao: number;
  conciliado: boolean;
  observacoes?: string[];
  [k: string]: any;
}

// -------------------- REST --------------------

export function fetchProjecao(params: ProjecaoParams): Promise<ProjecaoResponse> {
  return contabilApi.get<ProjecaoResponse>('/api/contabil/fluxo-caixa/projecao', {
    codemp: 1,
    horizonte_dias: 120,
    granularidade: 'mes',
    ...params,
  }, { timeoutMs: 60000 });
}

export function fetchDireto(params: RealizadoParams): Promise<DiretoResponse> {
  return contabilApi.get<DiretoResponse>('/api/contabil/fluxo-caixa/direto', {
    codemp: 1,
    ...params,
  }, { timeoutMs: 60000 });
}

export function fetchIndireto(params: RealizadoParams): Promise<IndiretoResponse> {
  return contabilApi.get<IndiretoResponse>('/api/contabil/fluxo-caixa/indireto', {
    codemp: 1,
    ...params,
  }, { timeoutMs: 60000 });
}

// -------------------- SSE Análise IA --------------------

export interface FCAnaliseParams extends RealizadoParams {
  horizonte_dias?: number;
  granularidade?: 'mes' | 'semana';
  data_base?: string;
  saldo_inicial?: number;
}

export interface FCAnaliseStreamHandlers {
  onMeta?: (meta: any) => void;
  onDelta?: (text: string) => void;
  onDone?: (info: any) => void;
  onErro?: (mensagem: string) => void;
  signal?: AbortSignal;
}

export async function streamFluxoCaixaAnalise(
  params: FCAnaliseParams,
  handlers: FCAnaliseStreamHandlers = {},
  extra?: {
    projecao?: unknown;
    direto?: unknown;
    indireto?: unknown;
  },
): Promise<void> {
  // Nova implementação: chama a edge function Lovable que usa a IA do Lovable
  // (Gemini 2.5 Pro) — mantém exatamente o mesmo contrato SSE do backend antigo.
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    handlers.onErro?.('Configuração do backend Lovable ausente (VITE_SUPABASE_URL).');
    return;
  }

  const url = `${String(supabaseUrl).replace(/\/+$/, '')}/functions/v1/fluxo-caixa-analise-ia`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'Authorization': `Bearer ${supabaseKey}`,
    'apikey': String(supabaseKey),
  };

  const payload = {
    periodo: {
      anomes_ini: params.anomes_ini,
      anomes_fim: params.anomes_fim,
      codemp: params.codemp ?? 1,
      codfil: params.codfil,
      horizonte_dias: params.horizonte_dias,
      granularidade: params.granularidade,
      data_base: params.data_base,
      saldo_inicial: params.saldo_inicial,
    },
    projecao: extra?.projecao ?? null,
    direto: extra?.direto ?? null,
    indireto: extra?.indireto ?? null,
  };

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: handlers.signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') return;
    handlers.onErro?.(e?.message || 'Falha de rede ao abrir o stream de análise.');
    return;
  }

  if (!resp.ok || !resp.body) {
    const bodyTxt = await resp.text().catch(() => '');
    handlers.onErro?.(bodyTxt || `HTTP ${resp.status} ao abrir stream de análise.`);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const parseBlock = (block: string) => {
    const trimmed = block.trim();
    if (!trimmed) return;
    const evMatch = trimmed.match(/^event:\s*(.+)$/m);
    const dataMatch = trimmed.match(/^data:\s*([\s\S]+)$/m);
    const ev = evMatch?.[1]?.trim();
    const dataRaw = dataMatch?.[1]?.trim() ?? '';
    let data: any = {};
    if (dataRaw) {
      try { data = JSON.parse(dataRaw); } catch { data = { text: dataRaw }; }
    }
    if (ev === 'meta') handlers.onMeta?.(data);
    else if (ev === 'delta') handlers.onDelta?.(String(data?.text ?? ''));
    else if (ev === 'done') handlers.onDone?.(data ?? {});
    else if (ev === 'erro') handlers.onErro?.(String(data?.erro ?? 'Erro na análise.'));
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) parseBlock(part);
    }
    if (buffer.trim()) parseBlock(buffer);
  } catch (e: any) {
    if (e?.name === 'AbortError') return;
    handlers.onErro?.(e?.message || 'Stream de análise interrompido.');
  } finally {
    try { reader.releaseLock(); } catch { /* noop */ }
  }
}


// -------------------- Excel --------------------

export async function downloadFluxoCaixaExcel(params: FCAnaliseParams): Promise<void> {
  const codemp = params.codemp ?? 1;
  const { url, headers } = buildContabilRequest(
    '/api/contabil/fluxo-caixa/exportar',
    { codemp, ...params },
  );
  const resp = await fetch(url, { method: 'GET', headers });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(txt || `Falha ao exportar (HTTP ${resp.status}).`);
  }
  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `fluxo_caixa_${codemp}_${params.anomes_ini}_${params.anomes_fim}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
