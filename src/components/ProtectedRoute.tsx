import { Navigate } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export function ProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { canView, loading, hasPermissions } = useUserPermissions();
  if (loading) return null;
  if (hasPermissions && !canView(path)) {
    return <Navigate to="/estoque" replace />;
  }
  return <>{children}</>;
}
