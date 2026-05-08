import { Navigate } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldAlert } from 'lucide-react';

// Rotas que mostram a própria UI de "sem permissão" em vez de redirecionar.
const SELF_HANDLED_FORBIDDEN = new Set<string>(['/gestao-sgu-usuarios']);

function NoAccessScreen() {
  const { logout, displayName, user } = useAuth();
  const label = displayName || user?.email || '';
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-lg text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <ShieldAlert className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Sem acesso liberado</h2>
        <p className="text-sm text-muted-foreground">
          Olá <strong className="text-foreground">{label}</strong>, sua conta está aprovada
          mas ainda não tem nenhuma tela liberada. Solicite a um administrador que vincule
          um perfil de acesso ao seu usuário.
        </p>
        <Button variant="outline" onClick={logout} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}

export function ProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { canView, loading, hasPermissions, firstAllowedPath } = useUserPermissions();
  if (loading) return null;

  if (!hasPermissions) {
    if (SELF_HANDLED_FORBIDDEN.has(path)) return <>{children}</>;
    return <NoAccessScreen />;
  }

  if (!canView(path)) {
    if (SELF_HANDLED_FORBIDDEN.has(path)) return <>{children}</>;
    if (firstAllowedPath && firstAllowedPath !== path) {
      return <Navigate to={firstAllowedPath} replace />;
    }
    return <NoAccessScreen />;
  }

  return <>{children}</>;
}

/** Componente para a rota raiz "/" — manda para a primeira tela permitida do usuário. */
export function PostLoginRedirect() {
  const { loading, firstAllowedPath, hasPermissions } = useUserPermissions();
  if (loading) return null;
  if (!hasPermissions || !firstAllowedPath) return <NoAccessScreen />;
  return <Navigate to={firstAllowedPath} replace />;
}
