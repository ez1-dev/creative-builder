import { useMemo } from 'react';
import { usePermissionsContext } from '@/contexts/PermissionsContext';

// Mantém a API existente; toda a carga real acontece no PermissionsProvider,
// uma única vez por usuário autenticado.
export function useUserPermissions() {
  const { permissions, canUseAi, isAdmin, loading } = usePermissionsContext();

  return useMemo(() => {
    const canView = (path: string) => {
      if (isAdmin) return true;
      const p = permissions.find((s) => s.screen_path === path);
      return p?.can_view ?? false;
    };

    const canEdit = (path: string) => {
      if (isAdmin) return true;
      const p = permissions.find((s) => s.screen_path === path);
      return p?.can_edit ?? false;
    };

    const canDelete = (path: string) => {
      if (isAdmin) return true;
      const p = permissions.find((s) => s.screen_path === path);
      return p?.can_delete ?? false;
    };


    const hasPermissions = isAdmin || permissions.length > 0;

    const PRIORITY_PATHS = [
      '/painel-compras',
      '/compras-produto',
      '/notas-recebimento',
      '/estoque',
      '/passagens-aereas',
      '/faturamento-genius',
    ];
    const viewablePaths = permissions.filter((p) => p.can_view).map((p) => p.screen_path);
    const firstAllowedPath =
      PRIORITY_PATHS.find((p) => viewablePaths.includes(p)) ??
      [...viewablePaths].sort()[0] ??
      (isAdmin ? '/estoque' : null);

    return {
      permissions,
      loading,
      canView,
      canEdit,
      canUseAi,
      isAdmin,
      hasPermissions,
      firstAllowedPath,
    };
  }, [permissions, canUseAi, isAdmin, loading]);
}
