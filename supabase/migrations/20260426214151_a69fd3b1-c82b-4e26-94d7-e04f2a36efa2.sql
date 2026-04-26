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

  -- Sentinela 'protected': a senha já está embutida no token efetivo
  -- (SHA-256(publicToken || '::' || senha)) calculado pelo frontend.
  -- O match do token na tabela já é prova de senha correta.
  IF link_rec.password_hash IS NOT NULL AND link_rec.password_hash <> 'protected' THEN
    IF _password IS NULL OR crypt(_password, link_rec.password_hash) <> link_rec.password_hash THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$function$;