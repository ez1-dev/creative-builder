import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAiPageContextValue, AiPageContextData } from '@/contexts/AiPageContext';

/**
 * Register the current page's context with the AI assistant.
 * Call this from each page that wants to provide rich context to the assistant.
 *
 * The context is automatically cleared when the component unmounts.
 *
 * @example
 * useAiPageContext({
 *   title: 'Contas a Pagar',
 *   kpis: { 'Total Aberto': 'R$ 1.250.000', 'Vencidos': 42 },
 *   filters: { mes: '2025-04' },
 *   summary: '120 títulos exibidos, top fornecedor: ACME (R$ 350k)',
 * });
 */
export function useAiPageContext(data: Omit<AiPageContextData, 'route'>) {
  const { setContext } = useAiPageContextValue();
  const { pathname } = useLocation();

  // Serialize for stable dep comparison
  const serialized = JSON.stringify(data);

  useEffect(() => {
    setContext({ ...data, route: pathname });
    return () => setContext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, pathname, setContext]);
}
