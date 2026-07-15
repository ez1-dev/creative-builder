
-- =========================================================
-- Modo Edição: rascunhos e snapshots (DRE + Balanço)
-- =========================================================

-- Função de permissão: pode publicar/editar o modelo oficial da DRE?
CREATE OR REPLACE FUNCTION public.can_edit_dre_oficial(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin(_uid) OR EXISTS (
    SELECT 1
    FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
    JOIN public.profile_screens ps ON ps.profile_id = ua.profile_id
    WHERE p.id = _uid
      AND ps.screen_path LIKE '/contabilidade/dre-studio%'
      AND ps.can_edit = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_balanco_oficial(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin(_uid) OR EXISTS (
    SELECT 1
    FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
    JOIN public.profile_screens ps ON ps.profile_id = ua.profile_id
    WHERE p.id = _uid
      AND ps.screen_path = '/contabilidade/balanco-patrimonial'
      AND ps.can_edit = true
  );
$$;

-- =========================================================
-- 1) Rascunhos pessoais
-- =========================================================

CREATE TABLE public.bi_dre_estrutura_rascunho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  modelo_id uuid NOT NULL,
  linhas jsonb NOT NULL DEFAULT '[]'::jsonb,
  depara jsonb NOT NULL DEFAULT '{}'::jsonb,
  base_versao integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, modelo_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_dre_estrutura_rascunho TO authenticated;
GRANT ALL ON public.bi_dre_estrutura_rascunho TO service_role;
ALTER TABLE public.bi_dre_estrutura_rascunho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rascunho dre - select" ON public.bi_dre_estrutura_rascunho
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own rascunho dre - insert" ON public.bi_dre_estrutura_rascunho
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own rascunho dre - update" ON public.bi_dre_estrutura_rascunho
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own rascunho dre - delete" ON public.bi_dre_estrutura_rascunho
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER trg_bi_dre_estrutura_rascunho_updated
  BEFORE UPDATE ON public.bi_dre_estrutura_rascunho
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bi_balanco_estrutura_rascunho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  linhas jsonb NOT NULL DEFAULT '[]'::jsonb,
  depara jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_balanco_estrutura_rascunho TO authenticated;
GRANT ALL ON public.bi_balanco_estrutura_rascunho TO service_role;
ALTER TABLE public.bi_balanco_estrutura_rascunho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rascunho bal - select" ON public.bi_balanco_estrutura_rascunho
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own rascunho bal - insert" ON public.bi_balanco_estrutura_rascunho
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own rascunho bal - update" ON public.bi_balanco_estrutura_rascunho
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own rascunho bal - delete" ON public.bi_balanco_estrutura_rascunho
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER trg_bi_balanco_estrutura_rascunho_updated
  BEFORE UPDATE ON public.bi_balanco_estrutura_rascunho
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2) Snapshots (versões nomeadas)
-- =========================================================

CREATE TABLE public.bi_dre_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  escopo text NOT NULL CHECK (escopo IN ('oficial','pessoal')),
  owner_id uuid,
  linhas jsonb NOT NULL,
  depara jsonb NOT NULL DEFAULT '{}'::jsonb,
  versao_origem integer,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bi_dre_snapshots_modelo_idx ON public.bi_dre_snapshots (modelo_id, escopo, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_dre_snapshots TO authenticated;
GRANT ALL ON public.bi_dre_snapshots TO service_role;
ALTER TABLE public.bi_dre_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dre snap - select" ON public.bi_dre_snapshots
  FOR SELECT TO authenticated
  USING (escopo = 'oficial' OR owner_id = auth.uid());
CREATE POLICY "dre snap - insert pessoal" ON public.bi_dre_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    (escopo = 'pessoal' AND owner_id = auth.uid())
    OR (escopo = 'oficial' AND public.can_edit_dre_oficial(auth.uid()))
  );
CREATE POLICY "dre snap - delete" ON public.bi_dre_snapshots
  FOR DELETE TO authenticated
  USING (
    (escopo = 'pessoal' AND owner_id = auth.uid())
    OR (escopo = 'oficial' AND public.can_edit_dre_oficial(auth.uid()))
  );

CREATE TABLE public.bi_balanco_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  escopo text NOT NULL CHECK (escopo IN ('oficial','pessoal')),
  owner_id uuid,
  linhas jsonb NOT NULL,
  depara jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bi_balanco_snapshots_idx ON public.bi_balanco_snapshots (escopo, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_balanco_snapshots TO authenticated;
GRANT ALL ON public.bi_balanco_snapshots TO service_role;
ALTER TABLE public.bi_balanco_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bal snap - select" ON public.bi_balanco_snapshots
  FOR SELECT TO authenticated
  USING (escopo = 'oficial' OR owner_id = auth.uid());
CREATE POLICY "bal snap - insert" ON public.bi_balanco_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    (escopo = 'pessoal' AND owner_id = auth.uid())
    OR (escopo = 'oficial' AND public.can_edit_balanco_oficial(auth.uid()))
  );
CREATE POLICY "bal snap - delete" ON public.bi_balanco_snapshots
  FOR DELETE TO authenticated
  USING (
    (escopo = 'pessoal' AND owner_id = auth.uid())
    OR (escopo = 'oficial' AND public.can_edit_balanco_oficial(auth.uid()))
  );

-- =========================================================
-- 3) Funções: snapshot atual e publicar/restaurar
-- =========================================================

-- Serializa o oficial atual da DRE em JSON (linhas + depara).
CREATE OR REPLACE FUNCTION public.dre_serializar_oficial(_modelo_id uuid)
RETURNS TABLE(linhas jsonb, depara jsonb, versao integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_linhas jsonb;
  v_depara jsonb;
  v_versao integer;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.ordem), '[]'::jsonb)
    INTO v_linhas
  FROM public.bi_dre_estrutura_v2 x
  WHERE x.modelo_id = _modelo_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
    INTO v_depara
  FROM public.bi_dre_depara_conta_ccu d;

  SELECT m.versao INTO v_versao FROM public.bi_dre_modelos m WHERE m.id = _modelo_id;

  RETURN QUERY SELECT v_linhas, v_depara, v_versao;
END;
$$;

-- Cria um snapshot a partir do estado oficial (útil como "backup pré-publicação").
CREATE OR REPLACE FUNCTION public.dre_snapshot_do_oficial(_modelo_id uuid, _nome text, _descricao text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_linhas jsonb;
  v_depara jsonb;
  v_versao integer;
BEGIN
  IF NOT public.can_edit_dre_oficial(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para snapshot do modelo oficial';
  END IF;
  SELECT linhas, depara, versao INTO v_linhas, v_depara, v_versao
  FROM public.dre_serializar_oficial(_modelo_id);
  INSERT INTO public.bi_dre_snapshots (modelo_id, nome, descricao, escopo, owner_id, linhas, depara, versao_origem, criado_por)
  VALUES (_modelo_id, _nome, _descricao, 'oficial', NULL, v_linhas, v_depara, v_versao, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Publica o rascunho do usuário no modelo oficial (com backup automático).
CREATE OR REPLACE FUNCTION public.dre_publicar_rascunho(_modelo_id uuid, _base_versao integer DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rasc RECORD;
  v_versao_atual integer;
  v_backup_id uuid;
  v_linha jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.can_edit_dre_oficial(v_uid) THEN
    RAISE EXCEPTION 'Sem permissão para publicar no modelo oficial';
  END IF;

  SELECT * INTO v_rasc FROM public.bi_dre_estrutura_rascunho
   WHERE user_id = v_uid AND modelo_id = _modelo_id;
  IF v_rasc IS NULL THEN RAISE EXCEPTION 'Rascunho inexistente'; END IF;

  SELECT versao INTO v_versao_atual FROM public.bi_dre_modelos WHERE id = _modelo_id;
  IF _base_versao IS NOT NULL AND _base_versao <> COALESCE(v_versao_atual, 0) THEN
    RAISE EXCEPTION 'Conflito de versão: modelo oficial mudou (esperado %, atual %)', _base_versao, v_versao_atual;
  END IF;

  -- Backup automático do oficial antes de sobrescrever
  v_backup_id := public.dre_snapshot_do_oficial(_modelo_id,
    'Backup pré-publicação — ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI'),
    'Snapshot automático antes da publicação do rascunho de ' || v_uid::text);

  -- Substitui linhas do oficial pelas do rascunho
  DELETE FROM public.bi_dre_estrutura_v2 WHERE modelo_id = _modelo_id;
  FOR v_linha IN SELECT * FROM jsonb_array_elements(v_rasc.linhas) LOOP
    INSERT INTO public.bi_dre_estrutura_v2 (
      id, modelo_id, ordem, codigo_linha, descricao, nivel, linha_pai_codigo,
      tipo_linha, formula, ativo,
      flag_soma, flag_inverte_sinal, flag_exibe_dre, flag_permite_drill, flag_negrito, flag_totalizadora
    )
    VALUES (
      COALESCE((v_linha->>'id')::uuid, gen_random_uuid()),
      _modelo_id,
      COALESCE((v_linha->>'ordem')::int, 0),
      v_linha->>'codigo_linha',
      v_linha->>'descricao',
      COALESCE((v_linha->>'nivel')::smallint, 1),
      NULLIF(v_linha->>'linha_pai_codigo',''),
      COALESCE(v_linha->>'tipo_linha','ANALITICA'),
      NULLIF(v_linha->>'formula',''),
      COALESCE((v_linha->>'ativo')::bool, true),
      COALESCE((v_linha->>'flag_soma')::bool, true),
      COALESCE((v_linha->>'flag_inverte_sinal')::bool, false),
      COALESCE((v_linha->>'flag_exibe_dre')::bool, true),
      COALESCE((v_linha->>'flag_permite_drill')::bool, true),
      COALESCE((v_linha->>'flag_negrito')::bool, false),
      COALESCE((v_linha->>'flag_totalizadora')::bool, false)
    );
  END LOOP;

  UPDATE public.bi_dre_modelos
     SET versao = COALESCE(versao,0) + 1, updated_at = now()
   WHERE id = _modelo_id;

  -- Remove rascunho após publicação bem-sucedida
  DELETE FROM public.bi_dre_estrutura_rascunho WHERE user_id = v_uid AND modelo_id = _modelo_id;

  RETURN v_backup_id;
END;
$$;

-- Restaura snapshot como rascunho pessoal (sempre permitido) ou como oficial (exige permissão).
CREATE OR REPLACE FUNCTION public.dre_restaurar_snapshot(_snapshot_id uuid, _destino text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_snap RECORD;
  v_linha jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _destino NOT IN ('rascunho','oficial') THEN
    RAISE EXCEPTION 'Destino inválido';
  END IF;

  SELECT * INTO v_snap FROM public.bi_dre_snapshots WHERE id = _snapshot_id;
  IF v_snap IS NULL THEN RAISE EXCEPTION 'Snapshot não encontrado'; END IF;
  IF v_snap.escopo = 'pessoal' AND v_snap.owner_id <> v_uid THEN
    RAISE EXCEPTION 'Sem acesso a este snapshot';
  END IF;

  IF _destino = 'rascunho' THEN
    INSERT INTO public.bi_dre_estrutura_rascunho (user_id, modelo_id, linhas, depara, base_versao)
    VALUES (v_uid, v_snap.modelo_id, v_snap.linhas, v_snap.depara, v_snap.versao_origem)
    ON CONFLICT (user_id, modelo_id) DO UPDATE
      SET linhas = EXCLUDED.linhas, depara = EXCLUDED.depara,
          base_versao = EXCLUDED.base_versao, updated_at = now();
  ELSE
    IF NOT public.can_edit_dre_oficial(v_uid) THEN
      RAISE EXCEPTION 'Sem permissão para restaurar como oficial';
    END IF;
    PERFORM public.dre_snapshot_do_oficial(v_snap.modelo_id,
      'Backup pré-restore — ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI'), NULL);
    DELETE FROM public.bi_dre_estrutura_v2 WHERE modelo_id = v_snap.modelo_id;
    FOR v_linha IN SELECT * FROM jsonb_array_elements(v_snap.linhas) LOOP
      INSERT INTO public.bi_dre_estrutura_v2 (
        id, modelo_id, ordem, codigo_linha, descricao, nivel, linha_pai_codigo,
        tipo_linha, formula, ativo,
        flag_soma, flag_inverte_sinal, flag_exibe_dre, flag_permite_drill, flag_negrito, flag_totalizadora
      )
      VALUES (
        COALESCE((v_linha->>'id')::uuid, gen_random_uuid()),
        v_snap.modelo_id,
        COALESCE((v_linha->>'ordem')::int, 0),
        v_linha->>'codigo_linha',
        v_linha->>'descricao',
        COALESCE((v_linha->>'nivel')::smallint, 1),
        NULLIF(v_linha->>'linha_pai_codigo',''),
        COALESCE(v_linha->>'tipo_linha','ANALITICA'),
        NULLIF(v_linha->>'formula',''),
        COALESCE((v_linha->>'ativo')::bool, true),
        COALESCE((v_linha->>'flag_soma')::bool, true),
        COALESCE((v_linha->>'flag_inverte_sinal')::bool, false),
        COALESCE((v_linha->>'flag_exibe_dre')::bool, true),
        COALESCE((v_linha->>'flag_permite_drill')::bool, true),
        COALESCE((v_linha->>'flag_negrito')::bool, false),
        COALESCE((v_linha->>'flag_totalizadora')::bool, false)
      );
    END LOOP;
    UPDATE public.bi_dre_modelos SET versao = COALESCE(versao,0) + 1, updated_at = now()
     WHERE id = v_snap.modelo_id;
  END IF;
END;
$$;

-- ============ Balanço ============

CREATE OR REPLACE FUNCTION public.balanco_serializar_oficial()
RETURNS TABLE(linhas jsonb, depara jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_linhas jsonb; v_depara jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.ordem), '[]'::jsonb) INTO v_linhas
  FROM public.bi_dre_estrutura x;
  SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]'::jsonb) INTO v_depara
  FROM public.bi_dre_mascara m;
  RETURN QUERY SELECT v_linhas, v_depara;
END;
$$;

CREATE OR REPLACE FUNCTION public.balanco_snapshot_do_oficial(_nome text, _descricao text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_linhas jsonb; v_depara jsonb;
BEGIN
  IF NOT public.can_edit_balanco_oficial(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para snapshot do balanço oficial';
  END IF;
  SELECT linhas, depara INTO v_linhas, v_depara FROM public.balanco_serializar_oficial();
  INSERT INTO public.bi_balanco_snapshots (nome, descricao, escopo, owner_id, linhas, depara, criado_por)
  VALUES (_nome, _descricao, 'oficial', NULL, v_linhas, v_depara, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.balanco_publicar_rascunho()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rasc RECORD;
  v_backup_id uuid;
  v_linha jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.can_edit_balanco_oficial(v_uid) THEN
    RAISE EXCEPTION 'Sem permissão para publicar o balanço oficial';
  END IF;

  SELECT * INTO v_rasc FROM public.bi_balanco_estrutura_rascunho WHERE user_id = v_uid;
  IF v_rasc IS NULL THEN RAISE EXCEPTION 'Rascunho inexistente'; END IF;

  v_backup_id := public.balanco_snapshot_do_oficial(
    'Backup pré-publicação — ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI'),
    'Snapshot automático antes da publicação'
  );

  DELETE FROM public.bi_dre_estrutura;
  FOR v_linha IN SELECT * FROM jsonb_array_elements(v_rasc.linhas) LOOP
    INSERT INTO public.bi_dre_estrutura (id, ordem, mascara, descricao, totalizadora, sinal, nivel, ativo)
    VALUES (
      COALESCE((v_linha->>'id')::uuid, gen_random_uuid()),
      COALESCE((v_linha->>'ordem')::int, 0),
      v_linha->>'mascara',
      v_linha->>'descricao',
      COALESCE((v_linha->>'totalizadora')::bool, false),
      COALESCE((v_linha->>'sinal')::smallint, 1),
      COALESCE((v_linha->>'nivel')::smallint, 1),
      COALESCE((v_linha->>'ativo')::bool, true)
    );
  END LOOP;

  DELETE FROM public.bi_balanco_estrutura_rascunho WHERE user_id = v_uid;
  RETURN v_backup_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.balanco_restaurar_snapshot(_snapshot_id uuid, _destino text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_snap RECORD;
  v_linha jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _destino NOT IN ('rascunho','oficial') THEN RAISE EXCEPTION 'Destino inválido'; END IF;

  SELECT * INTO v_snap FROM public.bi_balanco_snapshots WHERE id = _snapshot_id;
  IF v_snap IS NULL THEN RAISE EXCEPTION 'Snapshot não encontrado'; END IF;
  IF v_snap.escopo = 'pessoal' AND v_snap.owner_id <> v_uid THEN
    RAISE EXCEPTION 'Sem acesso a este snapshot';
  END IF;

  IF _destino = 'rascunho' THEN
    INSERT INTO public.bi_balanco_estrutura_rascunho (user_id, linhas, depara)
    VALUES (v_uid, v_snap.linhas, v_snap.depara)
    ON CONFLICT (user_id) DO UPDATE
      SET linhas = EXCLUDED.linhas, depara = EXCLUDED.depara, updated_at = now();
  ELSE
    IF NOT public.can_edit_balanco_oficial(v_uid) THEN
      RAISE EXCEPTION 'Sem permissão para restaurar como oficial';
    END IF;
    PERFORM public.balanco_snapshot_do_oficial(
      'Backup pré-restore — ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI'), NULL);
    DELETE FROM public.bi_dre_estrutura;
    FOR v_linha IN SELECT * FROM jsonb_array_elements(v_snap.linhas) LOOP
      INSERT INTO public.bi_dre_estrutura (id, ordem, mascara, descricao, totalizadora, sinal, nivel, ativo)
      VALUES (
        COALESCE((v_linha->>'id')::uuid, gen_random_uuid()),
        COALESCE((v_linha->>'ordem')::int, 0),
        v_linha->>'mascara',
        v_linha->>'descricao',
        COALESCE((v_linha->>'totalizadora')::bool, false),
        COALESCE((v_linha->>'sinal')::smallint, 1),
        COALESCE((v_linha->>'nivel')::smallint, 1),
        COALESCE((v_linha->>'ativo')::bool, true)
      );
    END LOOP;
  END IF;
END;
$$;
