import { useEffect, useState } from 'react';
import { api, getApiUrl } from '@/lib/api';

export type BlobStatus = 'loading' | 'ok' | 'error';

export interface BlobState {
  status: BlobStatus;
  blobUrl: string | null;
  error: string | null;
}

export type BlobStateMap = Record<string, BlobState>;

/**
 * Faz fetch autenticado (Bearer + ngrok-skip-browser-warning) de uma lista de URLs
 * e expõe um mapa url -> { status, blobUrl, error } para uso na renderização e no diagnóstico.
 */
export function useAuthedBlobUrls(urls: string[]): BlobStateMap {
  // Chave estável para o effect (lista ordenada de urls únicas)
  const key = JSON.stringify([...new Set(urls.filter(Boolean))].sort());
  const [states, setStates] = useState<BlobStateMap>({});

  useEffect(() => {
    const uniqueUrls = [...new Set(urls.filter(Boolean))];
    if (uniqueUrls.length === 0) {
      setStates({});
      return;
    }

    let cancelled = false;
    const created: string[] = [];

    // Estado inicial: tudo loading
    setStates(() => {
      const next: BlobStateMap = {};
      for (const u of uniqueUrls) next[u] = { status: 'loading', blobUrl: null, error: null };
      return next;
    });

    const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
    const token = api.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    uniqueUrls.forEach((u) => {
      const fullUrl = /^https?:\/\//i.test(u) ? u : `${getApiUrl()}${u.startsWith('/') ? '' : '/'}${u}`;
      fetch(fullUrl, { headers })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (cancelled) return;
          const blobUrl = URL.createObjectURL(blob);
          created.push(blobUrl);
          setStates((prev) => ({ ...prev, [u]: { status: 'ok', blobUrl, error: null } }));
        })
        .catch((e) => {
          if (cancelled) return;
          setStates((prev) => ({
            ...prev,
            [u]: { status: 'error', blobUrl: null, error: e?.message || 'Falha ao baixar arquivo' },
          }));
        });
    });

    return () => {
      cancelled = true;
      for (const b of created) {
        try { URL.revokeObjectURL(b); } catch { /* noop */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return states;
}
