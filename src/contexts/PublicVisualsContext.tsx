import { createContext, useContext, useMemo, ReactNode } from 'react';

interface PublicVisualsContextValue {
  hidden: Set<string>;
}

const PublicVisualsContext = createContext<PublicVisualsContextValue | null>(null);

interface ProviderProps {
  hiddenVisuals: string[];
  children: ReactNode;
}

/**
 * Provê a lista de visuais ocultos para páginas públicas (sem auth),
 * usadas via VisualGate. Quando presente, sobrescreve o useUserVisuals
 * normal — não consulta perfis no banco.
 */
export function PublicVisualsProvider({ hiddenVisuals, children }: ProviderProps) {
  const value = useMemo(
    () => ({ hidden: new Set(hiddenVisuals ?? []) }),
    [hiddenVisuals],
  );
  return (
    <PublicVisualsContext.Provider value={value}>{children}</PublicVisualsContext.Provider>
  );
}

export function usePublicVisuals() {
  return useContext(PublicVisualsContext);
}
