ALTER TABLE public.profile_screens ADD COLUMN IF NOT EXISTS can_delete boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_delete_frota(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_uid) OR EXISTS (
    SELECT 1
    FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
    JOIN public.profile_screens ps ON ps.profile_id = ua.profile_id
    WHERE p.id = _uid
      AND ps.screen_path = '/frota'
      AND ps.can_delete = true
  );
$$;

DROP POLICY IF EXISTS "Editors can delete manutencao_frota" ON public.manutencao_frota;
CREATE POLICY "Authorized can delete manutencao_frota"
ON public.manutencao_frota
FOR DELETE
TO authenticated
USING (public.can_delete_frota(auth.uid()));