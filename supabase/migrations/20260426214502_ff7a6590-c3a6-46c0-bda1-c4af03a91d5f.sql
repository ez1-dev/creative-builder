-- Recria a policy de UPDATE de profiles com WITH CHECK que trava o campo erp_user.
-- Postgres RLS não tem OLD/NEW; usamos subquery contra o valor atual da linha.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND erp_user IS NOT DISTINCT FROM (
    SELECT p.erp_user FROM public.profiles p WHERE p.id = auth.uid()
  )
);