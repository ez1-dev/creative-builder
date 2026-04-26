-- Tabela de passagens aéreas
CREATE TABLE public.passagens_aereas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  colaborador TEXT NOT NULL,
  centro_custo TEXT,
  projeto_obra TEXT,
  fornecedor TEXT,
  cia_aerea TEXT,
  numero_bilhete TEXT,
  localizador TEXT,
  origem TEXT,
  destino TEXT,
  data_ida DATE,
  data_volta DATE,
  motivo_viagem TEXT,
  tipo_despesa TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_passagens_aereas_data_registro ON public.passagens_aereas(data_registro);
CREATE INDEX idx_passagens_aereas_colaborador ON public.passagens_aereas(colaborador);
CREATE INDEX idx_passagens_aereas_centro_custo ON public.passagens_aereas(centro_custo);
CREATE INDEX idx_passagens_aereas_tipo_despesa ON public.passagens_aereas(tipo_despesa);

ALTER TABLE public.passagens_aereas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read passagens_aereas"
ON public.passagens_aereas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert passagens_aereas"
ON public.passagens_aereas FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update passagens_aereas"
ON public.passagens_aereas FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete passagens_aereas"
ON public.passagens_aereas FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_passagens_aereas_updated_at
BEFORE UPDATE ON public.passagens_aereas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Registrar rota nos perfis (Administrador com edição)
INSERT INTO public.profile_screens (profile_id, screen_path, screen_name, can_view, can_edit)
SELECT id, '/passagens-aereas', 'Passagens Aéreas', true, true
FROM public.access_profiles
WHERE name = 'Administrador'
ON CONFLICT DO NOTHING;