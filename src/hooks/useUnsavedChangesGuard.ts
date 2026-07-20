import { useEffect } from 'react';

/**
 * Bloqueia refresh/fechar aba quando `dirty === true`.
 * Não interfere na navegação via React Router — o navegador exibe o prompt
 * padrão apenas em unload real.
 */
export function useUnsavedChangesGuard(dirty: boolean, message?: string) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message ?? '';
      return message ?? '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, message]);
}
