import { ReactNode } from 'react';
import { useUserVisuals } from '@/hooks/useUserVisuals';

interface VisualGateProps {
  visualKey: string;
  children: ReactNode;
  /** Conteúdo opcional renderizado quando o usuário não pode ver. Default: null. */
  fallback?: ReactNode;
}

/**
 * Renderiza children apenas se o perfil do usuário tem permissão para ver esse gráfico/mapa.
 * Enquanto carrega, renderiza null para evitar flash. Admins sempre veem.
 */
export function VisualGate({ visualKey, children, fallback = null }: VisualGateProps) {
  const { canSeeVisual, loading } = useUserVisuals();
  if (loading) return null;
  if (!canSeeVisual(visualKey)) return <>{fallback}</>;
  return <>{children}</>;
}
