import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { startHeartbeat, stopHeartbeat, trackPageView } from '@/lib/userTracking';

export function UserTrackingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      stopHeartbeat();
      return;
    }
    startHeartbeat();
    return () => stopHeartbeat();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    trackPageView(location.pathname);
  }, [isAuthenticated, location.pathname]);

  return <>{children}</>;
}
