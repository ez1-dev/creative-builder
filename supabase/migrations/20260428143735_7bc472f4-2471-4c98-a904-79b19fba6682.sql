
-- Helper que decide quem pode gerenciar links de compartilhamento de Passagens Aéreas
CREATE OR REPLACE FUNCTION public.can_manage_passagens_share(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_uid)
    OR (
      EXISTS (
        SELECT 1 FROM public.app_settings
        WHERE key = 'passagens_share_allow_non_admin' AND value = 'true'
      )
      AND EXISTS (
        SELECT 1
        FROM public.user_access ua
        JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
        JOIN public.profile_screens ps ON ps.profile_id = ua.profile_id
        WHERE p.id = _uid
          AND ps.screen_path = '/passagens-aereas'
          AND ps.can_edit = true
      )
    );
$$;

-- Atualiza RLS da tabela de share links
DROP POLICY IF EXISTS "Admins manage share links" ON public.passagens_aereas_share_links;
CREATE POLICY "Manage passagens share links"
ON public.passagens_aereas_share_links
FOR ALL
TO authenticated
USING (public.can_manage_passagens_share(auth.uid()))
WITH CHECK (public.can_manage_passagens_share(auth.uid()));

-- Atualiza RPC para usar o novo helper
CREATE OR REPLACE FUNCTION public.create_passagens_share_link(
  _token text,
  _nome text,
  _password text DEFAULT NULL::text,
  _expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_id uuid;
  hashed text;
BEGIN
  IF NOT public.can_manage_passagens_share(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para criar links de compartilhamento';
  END IF;

  IF _password IS NOT NULL AND length(_password) > 0 THEN
    hashed := crypt(_password, gen_salt('bf'));
  ELSE
    hashed := NULL;
  END IF;

  INSERT INTO public.passagens_aereas_share_links (token, nome, password_hash, expires_at, created_by)
  VALUES (_token, _nome, hashed, _expires_at, auth.uid())
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

-- Seed da configuração (somente se não existir)
INSERT INTO public.app_settings (key, value)
VALUES ('passagens_share_allow_non_admin', 'false')
ON CONFLICT (key) DO NOTHING;
