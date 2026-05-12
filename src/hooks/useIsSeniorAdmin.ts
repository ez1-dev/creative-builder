import { useUserPermissions } from '@/hooks/useUserPermissions';

/** Considera admin do módulo Senior quem é Administrador do sistema
 *  ou possui can_edit na rota /regras-senior. */
export function useIsSeniorAdmin() {
  const { isAdmin, canEdit, loading, hasPermissions } = useUserPermissions();
  if (loading) return { isSeniorAdmin: false, loading: true };
  // Se não há perfis configurados (modo preview), libera. Caso contrário exige admin OU edit.
  const ok = isAdmin || !hasPermissions || canEdit('/regras-senior') || canEdit('/regras-senior/regras');
  return { isSeniorAdmin: ok, loading: false };
}
