// Cliente da API de Indicadores Contábeis.
// Reusa o contabilApi (base + Bearer + ngrok header + timeouts).
import { contabilApi, buildContabilRequest } from './contabilApi';

export type IndicadorUnidade = 'R$' | '%' | 'dias' | 'índice';
export type IndicadorStatus = 'oficial' | 'gerencial' | 'simulado';

export interface Indicador {
  indicador: string;
  valor: number | null;
  unidade: IndicadorUnidade;
  formula: string;
  numerador: number | null;
  denominador: number | null;
  dias: number | null;
  tipo_saldo: 'final' | 'medio' | null;
  status: IndicadorStatus;
  avisos: string[];
}

export interface AnaliseIA {
  narrativa?: string;
  modelo?: string;
  erro?: string;
}

export interface IndicadoresPayload {
  indicadores: Indicador[];
  duplicidade_612_ativa?: boolean;
  analise?: AnaliseIA;
  meta?: Record<string, any>;
  [k: string]: any;
}

export interface IndicadoresParams {
  anomes_ini: number | string;
  anomes_fim: number | string;
  codemp?: number | string;
  codfil?: number | string;
}

export function fetchIndicadores(params: IndicadoresParams): Promise<IndicadoresPayload> {
  return contabilApi.get<IndicadoresPayload>('/api/contabil/indicadores', {
    codemp: 1,
    ...params,
  });
}

/**
 * Fallback não-streaming da análise IA. Leva ~20s no backend; usar apenas
 * quando o streaming falhar. O fluxo padrão da UI usa `streamIndicadoresAnalise`.
 */
export function fetchIndicadoresComAnalise(params: IndicadoresParams): Promise<IndicadoresPayload> {
  return contabilApi.get<IndicadoresPayload>('/api/contabil/indicadores/analise', {
    codemp: 1,
    com_ia: true,
    ...params,
  }, { timeoutMs: 90000 });
}

// ---------------------------------------------------------------------------
// Streaming SSE da análise IA
// ---------------------------------------------------------------------------

export interface AnaliseStreamMeta {
  modelo?: string;
  periodo?: Record<string, any>;
  duplicidade_612_ativa?: boolean;
  [k: string]: any;
}

export interface AnaliseStreamHandlers {
  onMeta?: (meta: AnaliseStreamMeta) => void;
  /** Recebe cada pedaço de texto novo; concatene em ordem. */
  onDelta?: (text: string) => void;
  onDone?: (info: { chars?: number; [k: string]: any }) => void;
  onErro?: (mensagem: string) => void;
  signal?: AbortSignal;
}

/**
 * Consome `GET /api/contabil/indicadores/analise/stream` (SSE) usando fetch +
 * ReadableStream — EventSource não permite enviar `Authorization`.
 * Retorna quando o stream fecha (done, erro do servidor, abort ou fim de body).
 */
export async function streamIndicadoresAnalise(
  params: IndicadoresParams,
  handlers: AnaliseStreamHandlers = {},
): Promise<void> {
  const { url, headers } = buildContabilRequest(
    '/api/contabil/indicadores/analise/stream',
    { codemp: 1, ...params },
    { Accept: 'text/event-stream' },
  );

  let resp: Response;
  try {
    resp = await fetch(url, { method: 'GET', headers, signal: handlers.signal });
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
    if (ev === 'meta') handlers.onMeta?.(data as AnaliseStreamMeta);
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

// ---------------------------------------------------------------------------
// Download da planilha de conferência
// ---------------------------------------------------------------------------

/**
 * Baixa a planilha XLSX de conferência para a contabilidade. Precisa passar
 * pelo fetch autenticado (o backend exige Bearer), por isso não é possível
 * usar `<a href>` simples.
 */
export async function downloadIndicadoresExcel(params: IndicadoresParams): Promise<void> {
  const codemp = params.codemp ?? 1;
  const { url, headers } = buildContabilRequest(
    '/api/contabil/indicadores/exportar',
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
    a.download = `indicadores_contabeis_${codemp}_${params.anomes_ini}_${params.anomes_fim}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
