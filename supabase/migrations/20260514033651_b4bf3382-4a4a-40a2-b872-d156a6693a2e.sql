
-- =========================================================
-- Tabela principal
-- =========================================================
CREATE TABLE public.manutencao_maquinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  mes text,
  fornecedor text,
  descricao text,
  quantidade numeric DEFAULT 0,
  maquina text NOT NULL,
  tipo_maquina text,
  ordem_compra text,
  nota_fiscal text,
  valor numeric NOT NULL DEFAULT 0,
  centro_custo text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manutencao_maquinas ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Permissão de edição
-- =========================================================
CREATE OR REPLACE FUNCTION public.can_edit_maquinas(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_uid) OR EXISTS (
    SELECT 1
    FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
    JOIN public.profile_screens ps ON ps.profile_id = ua.profile_id
    WHERE p.id = _uid
      AND ps.screen_path = '/manutencao-maquinas'
      AND ps.can_edit = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_maquinas_share(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_uid) OR public.can_edit_maquinas(_uid);
$$;

-- =========================================================
-- RLS
-- =========================================================
CREATE POLICY "Authorized users can read manutencao_maquinas"
ON public.manutencao_maquinas FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
    JOIN public.profile_screens ps ON ps.profile_id = ua.profile_id
    WHERE p.id = auth.uid() AND ps.screen_path = '/manutencao-maquinas'
  )
);
CREATE POLICY "Editors can insert manutencao_maquinas"
ON public.manutencao_maquinas FOR INSERT TO authenticated
WITH CHECK (can_edit_maquinas(auth.uid()));
CREATE POLICY "Editors can update manutencao_maquinas"
ON public.manutencao_maquinas FOR UPDATE TO authenticated
USING (can_edit_maquinas(auth.uid()))
WITH CHECK (can_edit_maquinas(auth.uid()));
CREATE POLICY "Editors can delete manutencao_maquinas"
ON public.manutencao_maquinas FOR DELETE TO authenticated
USING (can_edit_maquinas(auth.uid()));

-- =========================================================
-- Trigger normalização
-- =========================================================
CREATE OR REPLACE FUNCTION public.normalize_maquinas_upper()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.maquina IS NOT NULL THEN NEW.maquina := upper(trim(NEW.maquina)); END IF;
  IF NEW.tipo_maquina IS NOT NULL THEN NEW.tipo_maquina := upper(trim(NEW.tipo_maquina)); END IF;
  IF NEW.centro_custo IS NOT NULL THEN NEW.centro_custo := upper(trim(NEW.centro_custo)); END IF;
  IF NEW.fornecedor IS NOT NULL THEN NEW.fornecedor := trim(NEW.fornecedor); END IF;
  IF NEW.descricao IS NOT NULL THEN NEW.descricao := trim(NEW.descricao); END IF;
  IF NEW.mes IS NULL OR NEW.mes = '' THEN
    NEW.mes := CASE extract(month from NEW.data)::int
      WHEN 1 THEN 'jan' WHEN 2 THEN 'fev' WHEN 3 THEN 'mar' WHEN 4 THEN 'abr'
      WHEN 5 THEN 'mai' WHEN 6 THEN 'jun' WHEN 7 THEN 'jul' WHEN 8 THEN 'ago'
      WHEN 9 THEN 'set' WHEN 10 THEN 'out' WHEN 11 THEN 'nov' WHEN 12 THEN 'dez'
    END;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_normalize_maquinas
BEFORE INSERT OR UPDATE ON public.manutencao_maquinas
FOR EACH ROW EXECUTE FUNCTION public.normalize_maquinas_upper();

CREATE TRIGGER trg_maquinas_updated_at
BEFORE UPDATE ON public.manutencao_maquinas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Tabela de share links
-- =========================================================
CREATE TABLE public.manutencao_maquinas_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  nome text NOT NULL,
  password_hash text,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz,
  hidden_visuals text[] NOT NULL DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  access_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.manutencao_maquinas_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage maquinas share links"
ON public.manutencao_maquinas_share_links FOR ALL TO authenticated
USING (can_manage_maquinas_share(auth.uid()))
WITH CHECK (can_manage_maquinas_share(auth.uid()));

CREATE TRIGGER trg_maquinas_share_updated_at
BEFORE UPDATE ON public.manutencao_maquinas_share_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Funções RPC para share links
-- =========================================================
CREATE OR REPLACE FUNCTION public.validate_maquinas_share_token(_token text, _password text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE link_rec RECORD;
BEGIN
  SELECT * INTO link_rec FROM public.manutencao_maquinas_share_links
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

CREATE OR REPLACE FUNCTION public.get_maquinas_share_link_meta(_token text)
RETURNS TABLE(exists_link boolean, requires_password boolean, expired boolean, nome text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE link_rec RECORD;
BEGIN
  SELECT * INTO link_rec FROM public.manutencao_maquinas_share_links
  WHERE token = _token AND active = true LIMIT 1;
  IF link_rec IS NULL THEN RETURN QUERY SELECT false, false, false, NULL::text; RETURN; END IF;
  RETURN QUERY SELECT true,
    (link_rec.password_hash IS NOT NULL),
    (link_rec.expires_at IS NOT NULL AND link_rec.expires_at < now()),
    link_rec.nome;
END; $$;

CREATE OR REPLACE FUNCTION public.get_maquinas_share_link_visuals(_token text)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE link_rec RECORD;
BEGIN
  SELECT * INTO link_rec FROM public.manutencao_maquinas_share_links
  WHERE token = _token AND active = true LIMIT 1;
  IF link_rec IS NULL THEN RETURN '{}'::text[]; END IF;
  IF link_rec.expires_at IS NOT NULL AND link_rec.expires_at < now() THEN RETURN '{}'::text[]; END IF;
  RETURN COALESCE(link_rec.hidden_visuals, '{}'::text[]);
END; $$;

CREATE OR REPLACE FUNCTION public.get_maquinas_via_token(_token text, _password text DEFAULT NULL)
RETURNS SETOF public.manutencao_maquinas LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.validate_maquinas_share_token(_token, _password) THEN
    RAISE EXCEPTION 'Token inválido ou expirado';
  END IF;
  UPDATE public.manutencao_maquinas_share_links
    SET access_count = access_count + 1, last_accessed_at = now()
    WHERE token = _token;
  RETURN QUERY SELECT * FROM public.manutencao_maquinas ORDER BY data DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.create_maquinas_share_link(
  _token text, _nome text, _password text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL, _hidden_visuals text[] DEFAULT '{}'::text[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; hashed text;
BEGIN
  IF NOT public.can_manage_maquinas_share(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para criar links de compartilhamento';
  END IF;
  IF _password = 'protected' THEN hashed := 'protected';
  ELSIF _password IS NOT NULL AND length(_password) > 0 THEN
    hashed := extensions.crypt(_password, extensions.gen_salt('bf'));
  ELSE hashed := NULL; END IF;
  INSERT INTO public.manutencao_maquinas_share_links (token, nome, password_hash, expires_at, created_by, hidden_visuals)
  VALUES (_token, _nome, hashed, _expires_at, auth.uid(), COALESCE(_hidden_visuals, '{}'::text[]))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_maquinas_layout_via_token(_token text)
RETURNS TABLE(widget_id uuid, widget_type text, widget_title text, widget_position integer, widget_layout jsonb, widget_config jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.validate_maquinas_share_token(_token, NULL) THEN
    RAISE EXCEPTION 'Token inválido ou expirado';
  END IF;
  RETURN QUERY
  SELECT w.id, w.type, w.title, w.position, w.layout, w.config
  FROM public.dashboard_widgets w
  JOIN public.dashboards d ON d.id = w.dashboard_id
  WHERE d.module = 'manutencao-maquinas'
    AND d.owner_id IS NULL AND d.is_default = true
  ORDER BY w.position;
END; $$;

-- =========================================================
-- Dashboard padrão
-- =========================================================
CREATE OR REPLACE FUNCTION public.upsert_maquinas_dashboard_default()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dash_id uuid; rec RECORD;
BEGIN
  SELECT id INTO v_dash_id FROM public.dashboards
  WHERE module = 'manutencao-maquinas' AND owner_id IS NULL AND is_default = true LIMIT 1;
  IF v_dash_id IS NULL THEN
    INSERT INTO public.dashboards (module, name, is_default, owner_id, position)
    VALUES ('manutencao-maquinas', 'Padrão', true, NULL, 0) RETURNING id INTO v_dash_id;
  END IF;

  DELETE FROM public.dashboard_widgets
  WHERE dashboard_id = v_dash_id
    AND type NOT LIKE 'custom-%'
    AND type NOT IN (
      'kpis-row', 'chart-evolucao-mensal', 'chart-tipo-maquina',
      'chart-top-maquinas', 'chart-top-fornecedores', 'chart-top-cc',
      'chart-top-descricoes', 'tabela-registros'
    );

  FOR rec IN
    SELECT * FROM (VALUES
      ('kpis-row'::text,                'KPIs'::text,                  0, '{"x":0,"y":0,  "w":12,"h":3}'::jsonb),
      ('chart-evolucao-mensal'::text,   'Evolução Mensal'::text,       1, '{"x":0,"y":3,  "w":6, "h":8}'::jsonb),
      ('chart-tipo-maquina'::text,      'Por Tipo de Máquina'::text,   2, '{"x":6,"y":3,  "w":6, "h":8}'::jsonb),
      ('chart-top-maquinas'::text,      'Top Máquinas'::text,          3, '{"x":0,"y":11, "w":6, "h":8}'::jsonb),
      ('chart-top-fornecedores'::text,  'Top Fornecedores'::text,      4, '{"x":6,"y":11, "w":6, "h":8}'::jsonb),
      ('chart-top-cc'::text,            'Top Centros de Custo'::text,  5, '{"x":0,"y":19, "w":6, "h":8}'::jsonb),
      ('chart-top-descricoes'::text,    'Top Descrições'::text,        6, '{"x":6,"y":19, "w":6, "h":8}'::jsonb),
      ('tabela-registros'::text,        'Registros'::text,             7, '{"x":0,"y":27, "w":12,"h":10}'::jsonb)
    ) AS t(w_type, w_title, w_pos, w_layout)
  LOOP
    IF EXISTS (SELECT 1 FROM public.dashboard_widgets WHERE dashboard_id = v_dash_id AND type = rec.w_type) THEN
      UPDATE public.dashboard_widgets
      SET title = rec.w_title, position = rec.w_pos, updated_at = now()
      WHERE dashboard_id = v_dash_id AND type = rec.w_type;
    ELSE
      INSERT INTO public.dashboard_widgets (dashboard_id, type, title, position, layout)
      VALUES (v_dash_id, rec.w_type, rec.w_title, rec.w_pos, rec.w_layout);
    END IF;
  END LOOP;

  RETURN v_dash_id;
END; $$;

SELECT public.upsert_maquinas_dashboard_default();

-- =========================================================
-- Cadastro da tela em todos os perfis (admin com edição)
-- =========================================================
INSERT INTO public.profile_screens (profile_id, screen_path, screen_name, can_view, can_edit)
SELECT ap.id, '/manutencao-maquinas', 'Manutenção de Máquinas', true,
       CASE WHEN ap.name = 'Administrador' THEN true ELSE false END
FROM public.access_profiles ap
WHERE NOT EXISTS (
  SELECT 1 FROM public.profile_screens ps
  WHERE ps.profile_id = ap.id AND ps.screen_path = '/manutencao-maquinas'
);
