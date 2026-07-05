
-- =========================================================================
-- Security hardening: restrict data exposure, lock SECURITY DEFINER surface,
-- tighten permissive RLS policies, and pin search_path.
-- =========================================================================

-- Helper: whether a user "owns" (is assigned to) a given profile_id.
CREATE OR REPLACE FUNCTION public.user_owns_profile(_profile_id uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
    WHERE p.id = _uid
      AND ua.profile_id = _profile_id
  );
$$;

-- 1) profile_screens: users only see rows for their own assigned profiles; admins see all.
DROP POLICY IF EXISTS "Authenticated can read profile_screens" ON public.profile_screens;
CREATE POLICY "Users read own profile_screens"
  ON public.profile_screens
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.user_owns_profile(profile_id, auth.uid()));

-- 2) profile_visuals: same scoping as profile_screens.
DROP POLICY IF EXISTS "Authenticated can read profile_visuals" ON public.profile_visuals;
CREATE POLICY "Users read own profile_visuals"
  ON public.profile_visuals
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.user_owns_profile(profile_id, auth.uid()));

-- 3) etl_acoes: only admins can read raw SQL templates / API endpoints.
DROP POLICY IF EXISTS "Authenticated read etl_acoes" ON public.etl_acoes;
CREATE POLICY "Admins read etl_acoes"
  ON public.etl_acoes
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4) etl_acao_sql_versoes: admins-only read of historical SQL templates.
DROP POLICY IF EXISTS "Authenticated read etl_acao_sql_versoes" ON public.etl_acao_sql_versoes;
CREATE POLICY "Admins read etl_acao_sql_versoes"
  ON public.etl_acao_sql_versoes
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5) etl_conexoes: add explicit admin-only SELECT policy (was implicitly deny-only).
DROP POLICY IF EXISTS "Admins read etl_conexoes" ON public.etl_conexoes;
CREATE POLICY "Admins read etl_conexoes"
  ON public.etl_conexoes
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 6) senior_disconnect_whitelist: admins-only read.
DROP POLICY IF EXISTS "Authenticated read senior_disconnect_whitelist" ON public.senior_disconnect_whitelist;
CREATE POLICY "Admins read senior_disconnect_whitelist"
  ON public.senior_disconnect_whitelist
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 7) relatorio_versoes: admins-only read (raw sql_base was leaking).
DROP POLICY IF EXISTS "Read versoes of visible relatorio" ON public.relatorio_versoes;
CREATE POLICY "Admins read relatorio_versoes"
  ON public.relatorio_versoes
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 8) relatorio_parametros: base table admins-only; expose safe RPC that returns
--    parameters for published reports without leaking sql_lista to non-admins.
DROP POLICY IF EXISTS "Read params of visible relatorio" ON public.relatorio_parametros;
CREATE POLICY "Admins read relatorio_parametros"
  ON public.relatorio_parametros
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_relatorio_parametros(_relatorio_id uuid)
RETURNS SETOF public.relatorio_parametros
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_admin  boolean;
BEGIN
  SELECT status INTO v_status FROM public.relatorios WHERE id = _relatorio_id;
  v_admin := public.is_admin(auth.uid());

  IF NOT v_admin AND (v_status IS DISTINCT FROM 'publicado') THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      p.relatorio_id,
      p.nome,
      p.label,
      p.tipo,
      p.obrigatorio,
      p.valor_padrao,
      p.ordem,
      CASE WHEN v_admin THEN p.sql_lista ELSE NULL END AS sql_lista,
      p.created_at
    FROM public.relatorio_parametros p
    WHERE p.relatorio_id = _relatorio_id
    ORDER BY p.ordem;
END;
$$;

-- 9) Pin search_path on the one trigger function still lacking it.
CREATE OR REPLACE FUNCTION public.dashboard_blocks_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 10) Tighten "always true" permissive policies.
DROP POLICY IF EXISTS "insert auditoria" ON public.bi_dre_auditoria;
CREATE POLICY "Authenticated insert auditoria"
  ON public.bi_dre_auditoria
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert error_logs" ON public.error_logs;
CREATE POLICY "Authenticated insert error_logs"
  ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- service_role bypasses RLS by default; this permissive policy is redundant.
DROP POLICY IF EXISTS "Service role manages preferences" ON public.user_preferences;

-- 11) SECURITY DEFINER functions: revoke broad EXECUTE and grant only where needed.
DO $$
DECLARE
  r record;
  public_fns text[] := ARRAY[
    'validate_share_token','validate_frota_share_token','validate_maquinas_share_token',
    'get_share_link_meta','get_share_link_visuals',
    'get_passagens_via_token','get_passagens_blocks_via_token','get_passagens_layout_via_token',
    'get_frota_share_link_meta','get_frota_share_link_visuals',
    'get_frota_via_token','get_frota_blocks_via_token','get_frota_layout_via_token',
    'get_maquinas_share_link_meta','get_maquinas_share_link_visuals',
    'get_maquinas_via_token','get_maquinas_blocks_via_token','get_maquinas_layout_via_token'
  ];
  internal_fns text[] := ARRAY[
    'dashboard_blocks_touch_updated_at','etl_acoes_versionar_sql','etl_agendamentos_before_save',
    'handle_new_user','normalize_frota_upper','normalize_maquinas_upper',
    'normalize_passagens_colaborador','normalize_tipos_maquina_nome',
    'prevent_erp_user_self_change','update_updated_at_column',
    'cleanup_old_error_logs','cleanup_old_navegacao_logs',
    'cleanup_old_search_history','cleanup_old_user_activity'
  ];
BEGIN
  FOR r IN
    SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      r.name, r.args
    );

    IF r.name = ANY(public_fns) THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon, authenticated',
        r.name, r.args
      );
    ELSIF r.name = ANY(internal_fns) THEN
      -- keep revoked; triggers/cron run as owner without needing role EXECUTE
      NULL;
    ELSE
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
        r.name, r.args
      );
    END IF;
  END LOOP;
END $$;
