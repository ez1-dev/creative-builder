-- Habilitar extensão para hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de links de compartilhamento
CREATE TABLE public.passagens_aereas_share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_passagens_share_token ON public.passagens_aereas_share_links(token);

ALTER TABLE public.passagens_aereas_share_links ENABLE ROW LEVEL SECURITY;

-- Apenas admins gerenciam
CREATE POLICY "Admins manage share links"
ON public.passagens_aereas_share_links FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_passagens_share_updated_at
BEFORE UPDATE ON public.passagens_aereas_share_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função: descobrir metadata do link (se existe e se exige senha)
CREATE OR REPLACE FUNCTION public.get_share_link_meta(_token text)
RETURNS TABLE(exists_link boolean, requires_password boolean, expired boolean, nome text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_rec RECORD;
BEGIN
  SELECT * INTO link_rec
  FROM public.passagens_aereas_share_links
  WHERE token = _token AND active = true
  LIMIT 1;

  IF link_rec IS NULL THEN
    RETURN QUERY SELECT false, false, false, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    (link_rec.password_hash IS NOT NULL),
    (link_rec.expires_at IS NOT NULL AND link_rec.expires_at < now()),
    link_rec.nome;
END;
$$;

-- Função: validar token + senha
CREATE OR REPLACE FUNCTION public.validate_share_token(_token text, _password text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF link_rec.password_hash IS NOT NULL THEN
    IF _password IS NULL OR crypt(_password, link_rec.password_hash) <> link_rec.password_hash THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Função: retornar dados via token (registra acesso)
CREATE OR REPLACE FUNCTION public.get_passagens_via_token(_token text, _password text DEFAULT NULL)
RETURNS SETOF public.passagens_aereas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.validate_share_token(_token, _password) THEN
    RAISE EXCEPTION 'Token inválido ou expirado';
  END IF;

  -- Registrar acesso
  UPDATE public.passagens_aereas_share_links
  SET access_count = access_count + 1,
      last_accessed_at = now()
  WHERE token = _token;

  RETURN QUERY SELECT * FROM public.passagens_aereas ORDER BY data_registro DESC;
END;
$$;

-- Permitir execução pública das funções
GRANT EXECUTE ON FUNCTION public.get_share_link_meta(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_share_token(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_passagens_via_token(text, text) TO anon, authenticated;