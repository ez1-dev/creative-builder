// Cliente HTTP dedicado à API contábil / DRE.
// Totalmente independente do ApiClient principal (src/lib/api.ts) — nunca compartilha base URL.
// Base padrão: https://api-erp-renato.ngrok.app (nunca contém /api/contabil).

import { api as erpApi } from '@/lib/api';
import { logError } from '@/lib/errorLogger';

const DEFAULT_CONTABIL_URL = 'https://api-erp-renato.ngrok.app';
const CONTABIL_TIMEOUT_MS = 15000;
// Porta legada da DRE antiga: qualquer URL apontando aqui deve cair para o default.
const LEGACY_DRE_PORT = ':8090';

let _contabilBaseUrl: string | null = null;
let _warnedLegacyPort = false;

const stripTrailingSlash = (u: string) => u.replace(/\/+$/, '');

function isLegacyDreUrl(u: string): boolean {
  return u.includes(LEGACY_DRE_PORT);
}

function warnLegacyPortOnce(source: string, badUrl: string) {
  if (_warnedLegacyPort) return;
  _warnedLegacyPort = true;
  // eslint-disable-next-line no-console
  console.warn(
    `[contabilApi] URL "${badUrl}" (via ${source}) aponta para a porta legada ${LEGACY_DRE_PORT}, ` +
    `que não atende mais a DRE integrada. Usando fallback ${DEFAULT_CONTABIL_URL}.`,
  );
}

export function getContabilBaseUrl(): string {
  if (_contabilBaseUrl) return stripTrailingSlash(_contabilBaseUrl);
  const env: any = (import.meta as any).env ?? {};
  // Prioridade: VITE_CONTABIL_API_URL (oficial) > VITE_DRE_API_URL (legado) > default.
  const envBase = env.VITE_CONTABIL_API_URL || env.VITE_DRE_API_URL;
  const source = env.VITE_CONTABIL_API_URL ? 'VITE_CONTABIL_API_URL' : 'VITE_DRE_API_URL';
  if (envBase) {
    const clean = stripTrailingSlash(String(envBase));
    if (/\.supabase\.co/i.test(clean)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[contabilApi] URL "${clean}" (via ${source}) aponta para o Supabase, ` +
        `que não é a API contábil FastAPI. Usando fallback ${DEFAULT_CONTABIL_URL}.`,
      );
      return DEFAULT_CONTABIL_URL;
    }
    if (isLegacyDreUrl(clean)) {
      warnLegacyPortOnce(source, clean);
      return DEFAULT_CONTABIL_URL;
    }
    return clean;
  }
  return DEFAULT_CONTABIL_URL;
}


export function setContabilBaseUrl(url: string | null | undefined) {
  if (!url) {
    _contabilBaseUrl = null;
    return;
  }
  const clean = stripTrailingSlash(String(url));
  if (isLegacyDreUrl(clean)) {
    warnLegacyPortOnce('setContabilBaseUrl', clean);
    _contabilBaseUrl = null;
    return;
  }
  _contabilBaseUrl = clean;
}


export interface ContabilHealthResult {
  ok: boolean;
  status: number | 'timeout' | 'network';
  urlTested: string;
  details?: string;
  data?: any;
}

export interface ContabilError extends Error {
  statusCode: number | 0;
  dreKind: 'api_offline' | 'timeout' | 'auth' | 'not_found' | 'functional';
  urlTested: string;
  bodyText?: string;
  details?: any;
}

function buildUrl(endpoint: string, params?: Record<string, any>): string {
  const base = getContabilBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${base}${path}`;
  if (params) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') sp.append(k, String(v));
    });
    const qs = sp.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }
  return url;
}

async function requestJson<T>(endpoint: string, options: RequestInit = {}, params?: Record<string, any>, timeoutMs?: number): Promise<T> {
  const url = buildUrl(endpoint, params);
  const effectiveTimeout = timeoutMs ?? CONTABIL_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), effectiveTimeout);

  const token = erpApi.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch (networkErr: any) {
    clearTimeout(timeout);
    const isTimeout = networkErr?.name === 'AbortError';
    const err: ContabilError = Object.assign(
      new Error(
        isTimeout
          ? `API contábil não respondeu em ${Math.round(effectiveTimeout / 1000)}s (${url}).`
          : `Não foi possível conectar à API contábil (${url}).`,
      ),
      {
        statusCode: 0 as const,
        dreKind: (isTimeout ? 'timeout' : 'api_offline') as ContabilError['dreKind'],
        urlTested: url,
        bodyText: networkErr?.message,
      },
    );
    logError({ module: endpoint, message: err.message, statusCode: 0, details: { url, err: networkErr?.message } });
    throw err;
  }
  clearTimeout(timeout);


  const rawText = await response.text().catch(() => '');
  let parsed: any = null;
  if (rawText) {
    try { parsed = JSON.parse(rawText); } catch { parsed = rawText; }
  }

  if (!response.ok) {
    const detail =
      (parsed && typeof parsed === 'object' && (parsed.detail ?? parsed.message)) ||
      (typeof parsed === 'string' ? parsed : null) ||
      `HTTP ${response.status}`;
    const kind: ContabilError['dreKind'] =
      response.status === 401 ? 'auth'
      : response.status === 404 ? 'not_found'
      : 'functional';
    const err: ContabilError = Object.assign(
      new Error(`API contábil retornou HTTP ${response.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`),
      {
        statusCode: response.status,
        dreKind: kind,
        urlTested: url,
        bodyText: rawText,
        details: parsed,
      },
    );
    if (response.status !== 404) {
      logError({ module: endpoint, message: err.message, statusCode: response.status, details: parsed });
    }
    throw err;
  }

  return parsed as T;
}

export const contabilApi = {
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return requestJson<T>(endpoint, { method: 'GET' }, params);
  },
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return requestJson<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  },
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return requestJson<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
  },
  async delete<T>(endpoint: string): Promise<T> {
    return requestJson<T>(endpoint, { method: 'DELETE' });
  },
};

export async function contabilApiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return requestJson<T>(endpoint, options);
}

/** Health check independente. Nunca lança — retorna estado tipado. */
export async function pingContabilHealth(): Promise<ContabilHealthResult> {
  const url = buildUrl('/api/contabil/health');
  try {
    const data = await contabilApi.get<any>('/api/contabil/health');
    return { ok: true, status: 200, urlTested: url, data };
  } catch (e: any) {
    const status: ContabilHealthResult['status'] =
      e?.dreKind === 'timeout' ? 'timeout'
      : e?.statusCode === 0 ? 'network'
      : (e?.statusCode ?? 'network');
    return {
      ok: false,
      status,
      urlTested: e?.urlTested ?? url,
      details: e?.bodyText ?? e?.message ?? 'Erro desconhecido',
    };
  }
}

/** Health check independente da API principal do ERP. */
export async function pingErpHealth(): Promise<ContabilHealthResult> {
  const { getApiUrl } = await import('@/lib/api');
  const base = stripTrailingSlash(getApiUrl());
  const url = `${base}/health`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONTABIL_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    clearTimeout(timeout);
    const text = await resp.text().catch(() => '');
    if (!resp.ok) {
      return { ok: false, status: resp.status, urlTested: url, details: text || `HTTP ${resp.status}` };
    }
    return { ok: true, status: resp.status, urlTested: url, details: text };
  } catch (e: any) {
    clearTimeout(timeout);
    const isTimeout = e?.name === 'AbortError';
    return {
      ok: false,
      status: isTimeout ? 'timeout' : 'network',
      urlTested: url,
      details: e?.message ?? 'Falha de rede',
    };
  }
}
