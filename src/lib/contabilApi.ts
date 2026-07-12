// Shim: expõe a interface esperada pelos módulos DRE Studio 5.2
// (`api.get/post/put/patch/del`, `ApiError`, `fixMojibake`, `buildQuery`, `apiRequest`)
// mas roteia todas as chamadas pelo cliente `contabilApi` unificado
// (src/lib/contabil/contabilApi.ts) — mesma base URL, timeout, header ngrok e token.

import {
  contabilApiFetch,
  getContabilBaseUrl,
} from '@/lib/contabil/contabilApi';

export function fixMojibake(s: unknown): string {
  if (s == null) return '';
  if (typeof s !== 'string') return String(s);
  if (!s || !/[ÃÂ][\u0080-\u00BF]/.test(s)) return s;
  try {
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return /[ÃÂ][\u0080-\u00BF]/.test(decoded) ? s : decoded;
  } catch {
    return s;
  }
}

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function toApiError(e: any): ApiError {
  if (e instanceof ApiError) return e;
  const status = typeof e?.statusCode === 'number' ? e.statusCode : 0;
  const err = new ApiError(status, e?.message ?? 'Erro na API contábil.', e?.details ?? e?.bodyText);
  (err as any).dreKind = e?.dreKind;
  (err as any).urlTested = e?.urlTested;
  return err;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, QueryValue> },
): Promise<T> {
  const { params, ...rest } = init ?? {};
  const endpoint = path + buildQuery(params);
  try {
    return await contabilApiFetch<T>(endpoint, rest);
  } catch (e) {
    throw toApiError(e);
  }
}

export const api = {
  get: <T>(path: string, params?: Record<string, QueryValue>) =>
    apiRequest<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown, params?: Record<string, QueryValue>) =>
    apiRequest<T>(path, {
      method: 'POST',
      params,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  del: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

export { getContabilBaseUrl };
