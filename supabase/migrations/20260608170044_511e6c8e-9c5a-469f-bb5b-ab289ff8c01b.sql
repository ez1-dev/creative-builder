CREATE TABLE public.bi_produto (
  cd_produto text PRIMARY KEY,
  ds_produto text,
  nm_produto text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bi_produto TO authenticated;
GRANT ALL ON public.bi_produto TO service_role;
ALTER TABLE public.bi_produto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_produto select authenticated" ON public.bi_produto FOR SELECT TO authenticated USING (true);