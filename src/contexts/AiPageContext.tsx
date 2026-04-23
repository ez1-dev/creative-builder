import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AiPageContextData {
  /** Page title shown to the AI (e.g. "Contas a Pagar") */
  title: string;
  /** Current route (e.g. "/contas-pagar") */
  route: string;
  /** Optional module key matching the AI tool enum (e.g. "estoque") */
  module?: string;
  /** Visible KPIs as label → value pairs */
  kpis?: Record<string, string | number>;
  /** Active filters */
  filters?: Record<string, any>;
  /** Free-form summary text (e.g. row counts, top items) */
  summary?: string;
}

interface AiPageContextValue {
  context: AiPageContextData | null;
  setContext: (ctx: AiPageContextData | null) => void;
}

const AiPageContext = createContext<AiPageContextValue | undefined>(undefined);

export function AiPageContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<AiPageContextData | null>(null);
  const setContext = useCallback((ctx: AiPageContextData | null) => {
    setContextState(ctx);
  }, []);
  return (
    <AiPageContext.Provider value={{ context, setContext }}>{children}</AiPageContext.Provider>
  );
}

export function useAiPageContextValue() {
  const ctx = useContext(AiPageContext);
  if (!ctx) throw new Error('useAiPageContextValue must be used within AiPageContextProvider');
  return ctx;
}
