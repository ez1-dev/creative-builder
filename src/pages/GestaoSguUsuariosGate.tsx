import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import GestaoSguUsuariosFallback from './GestaoSguUsuariosFallback';
import GestaoSguUsuariosPage from './GestaoSguUsuariosPage';
import AppLayoutShell from '@/components/AppLayoutShell';

const PATH = '/gestao-sgu-usuarios';

export default function GestaoSguUsuariosGate() {
  const { isAuthenticated, approved, loading: authLoading } = useAuth();
  const { canView, loading: permsLoading, hasPermissions } = useUserPermissions();

  if (authLoading) return null;

  if (!isAuthenticated || !approved) {
    return <GestaoSguUsuariosFallback variant="unauthenticated" />;
  }

  if (permsLoading) return null;

  if (hasPermissions && !canView(PATH)) {
    return (
      <AppLayoutShell>
        <GestaoSguUsuariosFallback variant="forbidden" />
      </AppLayoutShell>
    );
  }

  return (
    <AppLayoutShell>
      <GestaoSguUsuariosPage />
    </AppLayoutShell>
  );
}
