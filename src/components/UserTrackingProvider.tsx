import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  startHeartbeat,
  stopHeartbeat,
  trackPageView,
  trackNavegacao,
  bindNavegacaoUnload,
} from '@/lib/userTracking';

export function UserTrackingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      stopHeartbeat();
      return;
    }
    startHeartbeat();
    bindNavegacaoUnload();
    return () => stopHeartbeat();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    trackPageView(location.pathname);
    trackNavegacao(location.pathname, 'entrar');
  }, [isAuthenticated, location.pathname]);

  return <>{children}</>;
}
