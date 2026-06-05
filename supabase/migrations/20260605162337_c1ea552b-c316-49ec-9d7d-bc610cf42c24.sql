
CREATE TABLE public.bi_cliente (
  cd_cliente text PRIMARY KEY,
  nm_cliente text,
  nm_fantasia text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bi_cliente TO authenticated;
GRANT ALL ON public.bi_cliente TO service_role;

ALTER TABLE public.bi_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read bi_cliente"
  ON public.bi_cliente
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX bi_cliente_nm_cliente_lower_idx
  ON public.bi_cliente (lower(nm_cliente));
