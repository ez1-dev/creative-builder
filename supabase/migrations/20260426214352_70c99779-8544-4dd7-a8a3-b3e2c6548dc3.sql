-- Remove policy permissiva
DROP POLICY IF EXISTS "Authenticated can read user_access" ON public.user_access;

-- Admins continuam com leitura completa via "Admins manage user_access" (ALL)
-- Usuários comuns só veem o próprio vínculo
CREATE POLICY "Users can read own user_access"
ON public.user_access
FOR SELECT
TO authenticated
USING (
  upper(user_login) = upper(COALESCE(
    (SELECT erp_user FROM public.profiles WHERE id = auth.uid()),
    ''
  ))
  AND user_login <> ''
);