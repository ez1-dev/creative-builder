-- Restrict passagens_aereas SELECT to admins or users with screen access
DROP POLICY IF EXISTS "Authenticated can read passagens_aereas" ON public.passagens_aereas;

CREATE POLICY "Authorized users can read passagens_aereas"
ON public.passagens_aereas
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
    JOIN public.profile_screens ps ON ps.profile_id = ua.profile_id
    WHERE p.id = auth.uid()
      AND ps.screen_path = '/passagens-aereas'
  )
);

-- Prevent privilege escalation via erp_user modification
CREATE OR REPLACE FUNCTION public.prevent_erp_user_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.erp_user IS DISTINCT FROM OLD.erp_user THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar erp_user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_erp_user_self_change ON public.profiles;
CREATE TRIGGER trg_prevent_erp_user_self_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_erp_user_self_change();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);