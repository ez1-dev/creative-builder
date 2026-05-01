import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  startHeartbeat,
  stopHeartbeat,
  trackPageView,
} from '@/lib/userTracking';
import {
  logAbriuTela,
  logTrocouTela,
  logHeartbeat,
  bindBeforeUnloadFechouTela,
} from '@/lib/navegacaoLogger';

const HEARTBEAT_MS = 60_000;

export function UserTrackingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const heartbeatRef = useRef<number | null>(null);
  const lastPathRef = useRef<string | null>(null);

  // heartbeat de presença + heartbeat de navegação (60s)
  useEffect(() => {
    if (!isAuthenticated) {
      stopHeartbeat();
      if (heartbeatRef.current !== null) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }
    startHeartbeat();
    const unbind = bindBeforeUnloadFechouTela();
    heartbeatRef.current = window.setInterval(() => {
      void logHeartbeat(window.location.pathname);
    }, HEARTBEAT_MS);
    return () => {
      stopHeartbeat();
      unbind();
      if (heartbeatRef.current !== null) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // page view + abriu/trocou tela
  useEffect(() => {
    if (!isAuthenticated) return;
    trackPageView(location.pathname);
    const path = location.pathname;
    const prev = lastPathRef.current;
    lastPathRef.current = path;
    if (prev === null) {
      void logAbriuTela(path);
    } else if (prev !== path) {
      void logTrocouTela(path);
    }
  }, [isAuthenticated, location.pathname]);

  return <>{children}</>;
}
