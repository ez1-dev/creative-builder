CREATE TABLE public.bi_revenda (
  cd_rev_pedido text PRIMARY KEY,
  nm_revenda text,
  nm_fantasia text,
  cd_empresa integer,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bi_revenda TO authenticated;
GRANT ALL ON public.bi_revenda TO service_role;

ALTER TABLE public.bi_revenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bi_revenda_select_authenticated"
  ON public.bi_revenda FOR SELECT TO authenticated USING (true);

CREATE TRIGGER bi_revenda_set_updated_at
  BEFORE UPDATE ON public.bi_revenda
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();