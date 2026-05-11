
-- ===== Tabela principal =====
CREATE TABLE public.manutencao_frota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  mes text,
  placa text NOT NULL,
  veiculo_descricao text,
  fornecedor text,
  descricao text,
  quilometragem numeric,
  valor numeric NOT NULL DEFAULT 0,
  motorista text,
  centro_custo text,
  segmento text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_frota_data ON public.manutencao_frota(data);
CREATE INDEX idx_frota_placa ON public.manutencao_frota(placa);
CREATE INDEX idx_frota_centro_custo ON public.manutencao_frota(centro_custo);
CREATE INDEX idx_frota_segmento ON public.manutencao_frota(segmento);

-- Trigger updated_at
CREATE TRIGGER trg_frota_updated_at
  BEFORE UPDATE ON public.manutencao_frota
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger normaliza UPPER/trim
CREATE OR REPLACE FUNCTION public.normalize_frota_upper()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.placa IS NOT NULL THEN NEW.placa := upper(trim(NEW.placa)); END IF;
  IF NEW.veiculo_descricao IS NOT NULL THEN NEW.veiculo_descricao := upper(trim(NEW.veiculo_descricao)); END IF;
  IF NEW.motorista IS NOT NULL THEN NEW.motorista := upper(trim(NEW.motorista)); END IF;
  IF NEW.centro_custo IS NOT NULL THEN NEW.centro_custo := upper(trim(NEW.centro_custo)); END IF;
  IF NEW.segmento IS NOT NULL THEN NEW.segmento := upper(trim(NEW.segmento)); END IF;
  IF NEW.fornecedor IS NOT NULL THEN NEW.fornecedor := trim(NEW.fornecedor); END IF;
  -- Deriva mes (jan, fev, ...) a partir de data se não informado
  IF NEW.mes IS NULL OR NEW.mes = '' THEN
    NEW.mes := CASE extract(month from NEW.data)::int
      WHEN 1 THEN 'jan' WHEN 2 THEN 'fev' WHEN 3 THEN 'mar' WHEN 4 THEN 'abr'
      WHEN 5 THEN 'mai' WHEN 6 THEN 'jun' WHEN 7 THEN 'jul' WHEN 8 THEN 'ago'
      WHEN 9 THEN 'set' WHEN 10 THEN 'out' WHEN 11 THEN 'nov' WHEN 12 THEN 'dez'
    END;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_frota_normalize
  BEFORE INSERT OR UPDATE ON public.manutencao_frota
  FOR EACH ROW EXECUTE FUNCTION public.normalize_frota_upper();

-- ===== Tabela de links compartilhados =====
CREATE TABLE public.manutencao_frota_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  nome text NOT NULL,
  password_hash text,
  expires_at timestamptz,
  hidden_visuals text[] NOT NULL DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  access_count integer NOT NULL DEFAULT 0,
  last_accessed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_frota_share_updated_at
  BEFORE UPDATE ON public.manutencao_frota_share_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Funções de permissão =====
CREATE OR REPLACE FUNCTION public.can_edit_frota(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_uid) OR EXISTS (
    SELECT 1
    FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
    JOIN public.profile_screens ps ON ps.profile_id = ua.profile_id
    WHERE p.id = _uid
      AND ps.screen_path = '/frota'
      AND ps.can_edit = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_frota_share(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_uid) OR public.can_edit_frota(_uid);
$$;

-- ===== RLS =====
ALTER TABLE public.manutencao_frota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencao_frota_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can read manutencao_frota"
ON public.manutencao_frota FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1
    FROM user_access ua
    JOIN profiles p ON upper(p.erp_user) = upper(ua.user_login)
    JOIN profile_screens ps ON ps.profile_id = ua.profile_id
    WHERE p.id = auth.uid()
      AND ps.screen_path = '/frota'
  )
);

CREATE POLICY "Editors can insert manutencao_frota"
ON public.manutencao_frota FOR INSERT TO authenticated
WITH CHECK (can_edit_frota(auth.uid()));

CREATE POLICY "Editors can update manutencao_frota"
ON public.manutencao_frota FOR UPDATE TO authenticated
USING (can_edit_frota(auth.uid()))
WITH CHECK (can_edit_frota(auth.uid()));

CREATE POLICY "Editors can delete manutencao_frota"
ON public.manutencao_frota FOR DELETE TO authenticated
USING (can_edit_frota(auth.uid()));

CREATE POLICY "Manage frota share links"
ON public.manutencao_frota_share_links FOR ALL TO authenticated
USING (can_manage_frota_share(auth.uid()))
WITH CHECK (can_manage_frota_share(auth.uid()));

-- ===== RPCs de compartilhamento =====
CREATE OR REPLACE FUNCTION public.create_frota_share_link(
  _token text, _nome text, _password text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL, _hidden_visuals text[] DEFAULT '{}'::text[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; hashed text;
BEGIN
  IF NOT public.can_manage_frota_share(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para criar links de compartilhamento';
  END IF;
  IF _password = 'protected' THEN hashed := 'protected';
  ELSIF _password IS NOT NULL AND length(_password) > 0 THEN
    hashed := extensions.crypt(_password, extensions.gen_salt('bf'));
  ELSE hashed := NULL; END IF;

  INSERT INTO public.manutencao_frota_share_links (token, nome, password_hash, expires_at, created_by, hidden_visuals)
  VALUES (_token, _nome, hashed, _expires_at, auth.uid(), COALESCE(_hidden_visuals, '{}'::text[]))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_frota_share_token(_token text, _password text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE link_rec RECORD;
BEGIN
  SELECT * INTO link_rec FROM public.manutencao_frota_share_links
  WHERE token = _token AND active = true LIMIT 1;
  IF link_rec IS NULL THEN RETURN false; END IF;
  IF link_rec.expires_at IS NOT NULL AND link_rec.expires_at < now() THEN RETURN false; END IF;
  IF link_rec.password_hash IS NOT NULL AND link_rec.password_hash <> 'protected' THEN
    IF _password IS NULL OR extensions.crypt(_password, link_rec.password_hash) <> link_rec.password_hash THEN
      RETURN false;
    END IF;
  END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.get_frota_share_link_meta(_token text)
RETURNS TABLE(exists_link boolean, requires_password boolean, expired boolean, nome text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE link_rec RECORD;
BEGIN
  SELECT * INTO link_rec FROM public.manutencao_frota_share_links
  WHERE token = _token AND active = true LIMIT 1;
  IF link_rec IS NULL THEN
    RETURN QUERY SELECT false, false, false, NULL::text; RETURN;
  END IF;
  RETURN QUERY SELECT true,
    (link_rec.password_hash IS NOT NULL),
    (link_rec.expires_at IS NOT NULL AND link_rec.expires_at < now()),
    link_rec.nome;
END; $$;

CREATE OR REPLACE FUNCTION public.get_frota_share_link_visuals(_token text)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE link_rec RECORD;
BEGIN
  SELECT * INTO link_rec FROM public.manutencao_frota_share_links
  WHERE token = _token AND active = true LIMIT 1;
  IF link_rec IS NULL THEN RETURN '{}'::text[]; END IF;
  IF link_rec.expires_at IS NOT NULL AND link_rec.expires_at < now() THEN RETURN '{}'::text[]; END IF;
  RETURN COALESCE(link_rec.hidden_visuals, '{}'::text[]);
END; $$;

CREATE OR REPLACE FUNCTION public.get_frota_via_token(_token text, _password text DEFAULT NULL)
RETURNS SETOF public.manutencao_frota LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.validate_frota_share_token(_token, _password) THEN
    RAISE EXCEPTION 'Token inválido ou expirado';
  END IF;
  UPDATE public.manutencao_frota_share_links
    SET access_count = access_count + 1, last_accessed_at = now()
    WHERE token = _token;
  RETURN QUERY SELECT * FROM public.manutencao_frota ORDER BY data DESC;
END; $$;
