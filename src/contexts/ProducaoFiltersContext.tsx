import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface SharedProducaoFilters {
  numero_projeto: string;
  numero_desenho: string;
  revisao: string;
  cliente: string;
  cidade: string;
}

const emptyFilters: SharedProducaoFilters = {
  numero_projeto: '',
  numero_desenho: '',
  revisao: '',
  cliente: '',
  cidade: '',
};

interface ProducaoFiltersContextType {
  sharedFilters: SharedProducaoFilters;
  setSharedFilters: (updater: Partial<SharedProducaoFilters> | ((prev: SharedProducaoFilters) => SharedProducaoFilters)) => void;
  clearSharedFilters: () => void;
}

const ProducaoFiltersContext = createContext<ProducaoFiltersContextType | null>(null);

export function ProducaoFiltersProvider({ children }: { children: ReactNode }) {
  const [sharedFilters, setSharedFiltersState] = useState<SharedProducaoFilters>(emptyFilters);

  const setSharedFilters = useCallback((updater: Partial<SharedProducaoFilters> | ((prev: SharedProducaoFilters) => SharedProducaoFilters)) => {
    if (typeof updater === 'function') {
      setSharedFiltersState(updater);
    } else {
      setSharedFiltersState(prev => ({ ...prev, ...updater }));
    }
  }, []);

  const clearSharedFilters = useCallback(() => {
    setSharedFiltersState(emptyFilters);
  }, []);

  return (
    <ProducaoFiltersContext.Provider value={{ sharedFilters, setSharedFilters, clearSharedFilters }}>
      {children}
    </ProducaoFiltersContext.Provider>
  );
}

export function useProducaoFilters() {
  const ctx = useContext(ProducaoFiltersContext);
  if (!ctx) throw new Error('useProducaoFilters must be used within ProducaoFiltersProvider');
  return ctx;
}
