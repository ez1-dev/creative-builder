
CREATE TABLE public.tipos_maquina (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_maquina TO authenticated;
GRANT ALL ON public.tipos_maquina TO service_role;

ALTER TABLE public.tipos_maquina ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tipos_maquina_select_auth" ON public.tipos_maquina
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tipos_maquina_insert" ON public.tipos_maquina
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.can_edit_maquinas(auth.uid()));

CREATE POLICY "tipos_maquina_update" ON public.tipos_maquina
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.can_edit_maquinas(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.can_edit_maquinas(auth.uid()));

CREATE POLICY "tipos_maquina_delete" ON public.tipos_maquina
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.can_edit_maquinas(auth.uid()));

CREATE OR REPLACE FUNCTION public.normalize_tipos_maquina_nome()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.nome IS NOT NULL THEN
    NEW.nome := upper(trim(NEW.nome));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tipos_maquina_normalize
  BEFORE INSERT OR UPDATE ON public.tipos_maquina
  FOR EACH ROW EXECUTE FUNCTION public.normalize_tipos_maquina_nome();

INSERT INTO public.tipos_maquina (nome)
SELECT DISTINCT upper(trim(t)) FROM (
  VALUES
    ('PONTE ROLANTE'),('CORTE / LASER'),('SOLDA'),('COMPRESSOR'),('EMPILHADEIRA'),
    ('PINTURA'),('SERRA'),('CONFORMAÇÃO'),('USINAGEM'),('OUTROS')
) AS s(t)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.tipos_maquina (nome)
SELECT DISTINCT upper(trim(tipo_maquina))
FROM public.manutencao_maquinas
WHERE tipo_maquina IS NOT NULL AND trim(tipo_maquina) <> ''
ON CONFLICT (nome) DO NOTHING;
