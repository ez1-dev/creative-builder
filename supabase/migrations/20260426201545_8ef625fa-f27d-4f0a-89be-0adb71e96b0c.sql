CREATE OR REPLACE FUNCTION public.create_passagens_share_link(
  _token text,
  _nome text,
  _password text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  hashed text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem criar links';
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
$$;

GRANT EXECUTE ON FUNCTION public.create_passagens_share_link(text, text, text, timestamptz) TO authenticated;