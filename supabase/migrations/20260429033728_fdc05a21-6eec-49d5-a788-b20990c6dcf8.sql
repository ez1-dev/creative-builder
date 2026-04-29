CREATE OR REPLACE FUNCTION public.create_passagens_share_link(
  _token text,
  _nome text,
  _password text DEFAULT NULL,
  _expires_at timestamp with time zone DEFAULT NULL
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

  IF _password = 'protected' THEN
    hashed := 'protected';
  ELSIF _password IS NOT NULL AND length(_password) > 0 THEN
    hashed := extensions.crypt(_password, extensions.gen_salt('bf'));
  ELSE
    hashed := NULL;
  END IF;

  INSERT INTO public.passagens_aereas_share_links (token, nome, password_hash, expires_at, created_by)
  VALUES (_token, _nome, hashed, _expires_at, auth.uid())
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

UPDATE public.passagens_aereas_share_links
SET password_hash = 'protected'
WHERE active = true AND password_hash LIKE '$2%';