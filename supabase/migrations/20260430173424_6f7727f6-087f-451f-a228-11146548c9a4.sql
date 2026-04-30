ALTER TABLE public.passagens_aereas_share_links
  ADD COLUMN IF NOT EXISTS hidden_visuals text[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.create_passagens_share_link(
  _token text,
  _nome text,
  _password text DEFAULT NULL::text,
  _expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _hidden_visuals text[] DEFAULT '{}'::text[]
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

  IF _password = 'protected' THEN
    hashed := 'protected';
  ELSIF _password IS NOT NULL AND length(_password) > 0 THEN
    hashed := extensions.crypt(_password, extensions.gen_salt('bf'));
  ELSE
    hashed := NULL;
  END IF;

  INSERT INTO public.passagens_aereas_share_links (token, nome, password_hash, expires_at, created_by, hidden_visuals)
  VALUES (_token, _nome, hashed, _expires_at, auth.uid(), COALESCE(_hidden_visuals, '{}'::text[]))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_share_link_visuals(_token text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    RETURN '{}'::text[];
  END IF;

  IF link_rec.expires_at IS NOT NULL AND link_rec.expires_at < now() THEN
    RETURN '{}'::text[];
  END IF;

  RETURN COALESCE(link_rec.hidden_visuals, '{}'::text[]);
END;
$function$;