import { ReactNode } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

interface Props {
  feature: string;
  children: ReactNode;
  /** Renderiza este conteúdo quando a feature está desligada. Default: nada. */
  fallback?: ReactNode;
}

/** Esconde o conteúdo quando a feature está desligada para o usuário. */
export function FeatureGate({ feature, children, fallback = null }: Props) {
  const enabled = useFeatureFlag(feature);
  if (!enabled) return <>{fallback}</>;
  return <>{children}</>;
}
