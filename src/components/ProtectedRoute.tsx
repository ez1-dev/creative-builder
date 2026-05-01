import { Navigate } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';

// Rotas que mostram a própria UI de "sem permissão" em vez de redirecionar.
const SELF_HANDLED_FORBIDDEN = new Set<string>(['/gestao-sgu-usuarios']);

export function ProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { canView, loading, hasPermissions } = useUserPermissions();
  if (loading) return null;
  if (hasPermissions && !canView(path)) {
    if (SELF_HANDLED_FORBIDDEN.has(path)) return <>{children}</>;
    return <Navigate to="/estoque" replace />;
  }
  return <>{children}</>;
}
