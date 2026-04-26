CREATE TABLE public.colaboradores_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX colaboradores_catalogo_nome_lower_idx
  ON public.colaboradores_catalogo (lower(nome));

ALTER TABLE public.colaboradores_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read colaboradores_catalogo"
  ON public.colaboradores_catalogo FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage colaboradores_catalogo"
  ON public.colaboradores_catalogo FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_colaboradores_catalogo_updated
  BEFORE UPDATE ON public.colaboradores_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();