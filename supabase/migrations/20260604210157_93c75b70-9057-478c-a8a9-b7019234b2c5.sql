CREATE TABLE public.bi_meta_faturamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anomes_emissao text NOT NULL,
  unidade_negocio text NOT NULL CHECK (unidade_negocio IN ('GENIUS','ESTRUTURAL ZORTEA')),
  vl_meta numeric(18,2) NOT NULL DEFAULT 0,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (anomes_emissao, unidade_negocio)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_meta_faturamento TO authenticated;
GRANT ALL ON public.bi_meta_faturamento TO service_role;

ALTER TABLE public.bi_meta_faturamento ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_edit_bi_meta(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user)=upper(ua.user_login)
    JOIN public.profile_screens ps ON ps.profile_id=ua.profile_id
    WHERE p.id=_uid AND ps.screen_path='/bi/comercial/metas' AND ps.can_edit=true
  );
$$;

CREATE POLICY "metas_select_auth" ON public.bi_meta_faturamento
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "metas_write_admin" ON public.bi_meta_faturamento
  FOR ALL TO authenticated
  USING (public.can_edit_bi_meta(auth.uid()))
  WITH CHECK (public.can_edit_bi_meta(auth.uid()));

CREATE TRIGGER bi_meta_faturamento_updated_at
  BEFORE UPDATE ON public.bi_meta_faturamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();