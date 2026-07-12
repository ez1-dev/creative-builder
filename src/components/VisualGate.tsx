import { ReactNode } from 'react';
import { useUserVisuals } from '@/hooks/useUserVisuals';
import { useDemoMode } from '@/contexts/DemoModeContext';

interface VisualGateProps {
  visualKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function VisualGate({ visualKey, children, fallback = null }: VisualGateProps) {
  const { canSeeVisual, loading } = useUserVisuals();
  const { isVisualHidden } = useDemoMode();
  if (loading) return null;
  if (isVisualHidden(visualKey)) return <>{fallback}</>;
  if (!canSeeVisual(visualKey)) return <>{fallback}</>;
  return <>{children}</>;
}
