
-- Função helper: pode gerenciar liberações?
CREATE OR REPLACE FUNCTION public.can_manage_liberacoes(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin(_uid)
      OR EXISTS (
        SELECT 1
        FROM user_access ua
        JOIN profile_screens ps ON ps.profile_id = ua.profile_id
        JOIN profiles p ON upper(p.erp_user) = upper(ua.user_login)
        WHERE p.id = _uid
          AND ps.screen_path = '/gestao-perfis-acesso'
          AND ps.can_edit = true
      );
$$;

-- profile_features
CREATE TABLE public.profile_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, feature_key)
);
CREATE INDEX profile_features_profile_idx ON public.profile_features(profile_id);
CREATE INDEX profile_features_key_idx ON public.profile_features(feature_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_features TO authenticated;
GRANT ALL ON public.profile_features TO service_role;
ALTER TABLE public.profile_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own profile features or admin"
  ON public.profile_features FOR SELECT TO authenticated
  USING (
    public.can_manage_liberacoes(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_access ua
      JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
      WHERE p.id = auth.uid() AND ua.profile_id = profile_features.profile_id
    )
  );

CREATE POLICY "manage profile features (admin/gestor)"
  ON public.profile_features FOR ALL TO authenticated
  USING (public.can_manage_liberacoes(auth.uid()))
  WITH CHECK (public.can_manage_liberacoes(auth.uid()));

-- user_feature_overrides
CREATE TABLE public.user_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key)
);
CREATE INDEX user_feature_overrides_user_idx ON public.user_feature_overrides(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_feature_overrides TO authenticated;
GRANT ALL ON public.user_feature_overrides TO service_role;
ALTER TABLE public.user_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own overrides or admin"
  ON public.user_feature_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_liberacoes(auth.uid()));

CREATE POLICY "manage user feature overrides (admin/gestor)"
  ON public.user_feature_overrides FOR ALL TO authenticated
  USING (public.can_manage_liberacoes(auth.uid()))
  WITH CHECK (public.can_manage_liberacoes(auth.uid()));

-- user_screen_overrides
CREATE TABLE public.user_screen_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  screen_path text NOT NULL,
  screen_name text,
  can_view boolean,
  can_edit boolean,
  can_delete boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, screen_path)
);
CREATE INDEX user_screen_overrides_user_idx ON public.user_screen_overrides(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_screen_overrides TO authenticated;
GRANT ALL ON public.user_screen_overrides TO service_role;
ALTER TABLE public.user_screen_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own screen overrides or admin"
  ON public.user_screen_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_liberacoes(auth.uid()));

CREATE POLICY "manage user screen overrides (admin/gestor)"
  ON public.user_screen_overrides FOR ALL TO authenticated
  USING (public.can_manage_liberacoes(auth.uid()))
  WITH CHECK (public.can_manage_liberacoes(auth.uid()));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_liberacoes_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TRIGGER profile_features_updated BEFORE UPDATE ON public.profile_features
  FOR EACH ROW EXECUTE FUNCTION public.tg_liberacoes_updated_at();
CREATE TRIGGER user_feature_overrides_updated BEFORE UPDATE ON public.user_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.tg_liberacoes_updated_at();
CREATE TRIGGER user_screen_overrides_updated BEFORE UPDATE ON public.user_screen_overrides
  FOR EACH ROW EXECUTE FUNCTION public.tg_liberacoes_updated_at();
