-- Qualifica chamadas de pgcrypto (crypt/gen_salt) com schema 'extensions'
-- pois pgcrypto está instalado em 'extensions' e as funções têm search_path=public.

CREATE OR REPLACE FUNCTION public.create_passagens_share_link(
  _token text,
  _nome text,
  _password text DEFAULT NULL::text,
  _expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  hashed text;
BEGIN
  IF NOT public.can_manage_passagens_share(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para criar links de compartilhamento';
  END IF;

  IF _password IS NOT NULL AND length(_password) > 0 THEN
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

CREATE OR REPLACE FUNCTION public.validate_share_token(_token text, _password text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  link_rec RECORD;
BEGIN
  SELECT * INTO link_rec
  FROM public.passagens_aereas_share_links
  WHERE token = _token AND active = true
  LIMIT 1;

  IF link_rec IS NULL THEN
    RETURN false;
  END IF;

  IF link_rec.expires_at IS NOT NULL AND link_rec.expires_at < now() THEN
    RETURN false;
  END IF;

  IF link_rec.password_hash IS NOT NULL AND link_rec.password_hash <> 'protected' THEN
    IF _password IS NULL OR extensions.crypt(_password, link_rec.password_hash) <> link_rec.password_hash THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$function$;