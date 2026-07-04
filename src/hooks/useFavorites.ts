import { useCallback, useEffect, useState } from 'react';

const KEY = 'sidebar:favorites';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setFavorites(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: string[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  }, []);

  const isFavorite = useCallback((url: string) => favorites.includes(url), [favorites]);

  const toggle = useCallback(
    (url: string) => {
      const next = favorites.includes(url)
        ? favorites.filter((u) => u !== url)
        : [...favorites, url];
      persist(next);
    },
    [favorites, persist],
  );

  return { favorites, isFavorite, toggle };
}
