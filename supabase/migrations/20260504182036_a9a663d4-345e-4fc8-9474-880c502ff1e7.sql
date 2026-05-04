UPDATE public.passagens_aereas SET colaborador = upper(trim(colaborador)) WHERE colaborador IS NOT NULL AND colaborador <> upper(trim(colaborador));

CREATE OR REPLACE FUNCTION public.normalize_passagens_colaborador()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.colaborador IS NOT NULL THEN
    NEW.colaborador := upper(trim(NEW.colaborador));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS passagens_aereas_normalize_colab ON public.passagens_aereas;
CREATE TRIGGER passagens_aereas_normalize_colab
BEFORE INSERT OR UPDATE ON public.passagens_aereas
FOR EACH ROW EXECUTE FUNCTION public.normalize_passagens_colaborador();

UPDATE public.colaboradores_catalogo SET nome = upper(trim(nome)) WHERE nome IS NOT NULL AND nome <> upper(trim(nome));