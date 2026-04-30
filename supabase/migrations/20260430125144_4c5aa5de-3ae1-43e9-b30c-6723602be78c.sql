ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS force_logout_at timestamptz;

CREATE OR REPLACE FUNCTION public.force_user_logout(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.user_sessions SET force_logout_at = now() WHERE user_id = _user_id;
END;
$$;