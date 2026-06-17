CREATE TABLE public.bi_dre_depara_conta_ccu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cd_conta_contabil text NOT NULL,
  cd_centro_custos text NOT NULL,
  cd_mascara_dre text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bi_dre_depara_conta_ccu_uniq
  ON public.bi_dre_depara_conta_ccu (upper(cd_conta_contabil), upper(cd_centro_custos));
CREATE INDEX bi_dre_depara_conta_ccu_conta_idx ON public.bi_dre_depara_conta_ccu (cd_conta_contabil);
CREATE INDEX bi_dre_depara_conta_ccu_ccu_idx ON public.bi_dre_depara_conta_ccu (cd_centro_custos);
CREATE INDEX bi_dre_depara_conta_ccu_mascara_idx ON public.bi_dre_depara_conta_ccu (cd_mascara_dre);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_dre_depara_conta_ccu TO authenticated;
GRANT ALL ON public.bi_dre_depara_conta_ccu TO service_role;

ALTER TABLE public.bi_dre_depara_conta_ccu ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dre_depara_select_authenticated"
  ON public.bi_dre_depara_conta_ccu FOR SELECT TO authenticated USING (true);

CREATE POLICY "dre_depara_insert_admin"
  ON public.bi_dre_depara_conta_ccu FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "dre_depara_update_admin"
  ON public.bi_dre_depara_conta_ccu FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "dre_depara_delete_admin"
  ON public.bi_dre_depara_conta_ccu FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_bi_dre_depara_conta_ccu_updated_at
  BEFORE UPDATE ON public.bi_dre_depara_conta_ccu
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();