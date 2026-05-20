import { useEffect, useState } from 'react';
import { api, getApiUrl } from '@/lib/api';

export function useAuthedBlobUrl(url?: string) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }
    let cancelled = false;
    let created: string | null = null;
    setLoading(true);
    setError(null);

    const fullUrl = /^https?:\/\//i.test(url) ? url : `${getApiUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
    const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
    const token = api.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(fullUrl, { headers })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setBlobUrl(created);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Falha ao baixar arquivo');
        setBlobUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  return { blobUrl, loading, error };
}
