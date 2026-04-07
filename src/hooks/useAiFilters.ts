import { useEffect, useRef } from 'react';

interface AiFilterEvent {
  module: string;
  filters: Record<string, any>;
}

/**
 * Hook that listens for AI-dispatched filter events and applies them.
 * @param moduleName - The module this page represents (e.g. "estoque")
 * @param setFilters - State setter for the page's filters
 * @param triggerSearch - Function to execute search after filters are set
 */
export function useAiFilters(
  moduleName: string,
  setFilters: (updater: (prev: any) => any) => void,
  triggerSearch: () => void
) {
  const searchRef = useRef(triggerSearch);
  searchRef.current = triggerSearch;

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AiFilterEvent>).detail;
      if (detail.module !== moduleName) return;

      setFilters((prev: any) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(detail.filters)) {
          if (key in next) {
            next[key] = value;
          }
        }
        return next;
      });

      // Small delay to let React flush the state update
      setTimeout(() => searchRef.current(), 100);
    };

    window.addEventListener('erp:apply-filters', handler);
    return () => window.removeEventListener('erp:apply-filters', handler);
  }, [moduleName, setFilters]);
}

/** Dispatch filter event from the AI chat */
export function dispatchAiFilters(module: string, filters: Record<string, any>) {
  window.dispatchEvent(
    new CustomEvent('erp:apply-filters', { detail: { module, filters } })
  );
}
