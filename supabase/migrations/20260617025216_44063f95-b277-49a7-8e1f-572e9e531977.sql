CREATE TABLE public.bi_dre_excecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nr_lancamento text NOT NULL,
  nr_lote text,
  nr_documento text,
  cd_conta text,
  cd_cencus text,
  cd_origem text,
  cd_transacao text,
  ds_historico text,
  anomes_referente integer,
  vl_realizado numeric,
  codigo_linha_origem text NOT NULL,
  codigo_linha_destino text NOT NULL DEFAULT 'NAO_CLASSIFICADO',
  motivo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nr_lancamento, codigo_linha_origem)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_dre_excecoes TO authenticated;
GRANT ALL ON public.bi_dre_excecoes TO service_role;

ALTER TABLE public.bi_dre_excecoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem excecoes DRE"
  ON public.bi_dre_excecoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam excecoes DRE"
  ON public.bi_dre_excecoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autor ou admin edita excecoes DRE"
  ON public.bi_dre_excecoes FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admin exclui excecoes DRE"
  ON public.bi_dre_excecoes FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER set_bi_dre_excecoes_updated_at
  BEFORE UPDATE ON public.bi_dre_excecoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bi_dre_excecoes_lanc ON public.bi_dre_excecoes(nr_lancamento) WHERE ativo;
CREATE INDEX idx_bi_dre_excecoes_origem ON public.bi_dre_excecoes(codigo_linha_origem) WHERE ativo;