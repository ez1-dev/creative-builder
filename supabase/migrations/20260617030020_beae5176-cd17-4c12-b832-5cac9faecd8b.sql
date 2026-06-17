
CREATE TYPE public.dre_classificacao_escopo AS ENUM ('LANCAMENTO','DOCUMENTO','COMBINACAO','REGRA_DEFINITIVA');
CREATE TYPE public.dre_classificacao_status AS ENUM ('ATIVO','PENDENTE_APROVACAO','APROVADO','REJEITADO','INATIVO');

CREATE TABLE public.bi_dre_classificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo public.dre_classificacao_escopo NOT NULL,
  status public.dre_classificacao_status NOT NULL DEFAULT 'ATIVO',
  nr_lancamento text,
  nr_lote text,
  nr_documento text,
  cd_mascara text,
  cd_conta_contabil text,
  cd_centro_custos text,
  cd_centro_custos_3 text,
  cd_origem_lcto text,
  cd_tns text,
  ds_historico text,
  anomes_referente integer,
  vl_realizado numeric,
  codigo_linha_origem text NOT NULL,
  codigo_linha_destino text NOT NULL,
  motivo text NOT NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bi_dre_classificacoes_status_escopo_idx ON public.bi_dre_classificacoes(escopo, status);
CREATE INDEX bi_dre_classificacoes_lanc_idx ON public.bi_dre_classificacoes(nr_lancamento) WHERE nr_lancamento IS NOT NULL;
CREATE INDEX bi_dre_classificacoes_doc_idx ON public.bi_dre_classificacoes(nr_documento) WHERE nr_documento IS NOT NULL;
CREATE INDEX bi_dre_classificacoes_combo_idx ON public.bi_dre_classificacoes(cd_tns, cd_conta_contabil, cd_centro_custos, cd_origem_lcto);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_dre_classificacoes TO authenticated;
GRANT ALL ON public.bi_dre_classificacoes TO service_role;

ALTER TABLE public.bi_dre_classificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read classificacoes" ON public.bi_dre_classificacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert classificacoes" ON public.bi_dre_classificacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin update classificacoes" ON public.bi_dre_classificacoes FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin delete classificacoes" ON public.bi_dre_classificacoes FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER bi_dre_classificacoes_set_updated_at
BEFORE UPDATE ON public.bi_dre_classificacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
