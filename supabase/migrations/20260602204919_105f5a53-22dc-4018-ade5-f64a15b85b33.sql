
-- 1. Adicionar colunas em etl_acoes
ALTER TABLE public.etl_acoes
  ADD COLUMN IF NOT EXISTS sql_template text,
  ADD COLUMN IF NOT EXISTS sql_versao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sql_atualizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS sql_atualizado_por uuid;

-- 2. Tabela de histórico
CREATE TABLE IF NOT EXISTS public.etl_acao_sql_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id uuid NOT NULL REFERENCES public.etl_acoes(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  sql_template text,
  comentario text,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(acao_id, versao)
);

CREATE INDEX IF NOT EXISTS idx_etl_acao_sql_versoes_acao ON public.etl_acao_sql_versoes(acao_id, versao DESC);

GRANT SELECT ON public.etl_acao_sql_versoes TO authenticated;
GRANT ALL ON public.etl_acao_sql_versoes TO service_role;

ALTER TABLE public.etl_acao_sql_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read etl_acao_sql_versoes"
  ON public.etl_acao_sql_versoes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage etl_acao_sql_versoes"
  ON public.etl_acao_sql_versoes FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 3. Trigger para versionar SQL automaticamente
CREATE OR REPLACE FUNCTION public.etl_acoes_versionar_sql()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comentario text;
BEGIN
  -- Só versionar se sql_template realmente mudou
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.sql_template, '') IS DISTINCT FROM COALESCE(OLD.sql_template, '') THEN
    v_comentario := current_setting('app.sql_comentario', true);

    -- Salva a versão ANTERIOR no histórico
    INSERT INTO public.etl_acao_sql_versoes (acao_id, versao, sql_template, comentario, criado_por)
    VALUES (OLD.id, OLD.sql_versao, OLD.sql_template, v_comentario, OLD.sql_atualizado_por);

    NEW.sql_versao := OLD.sql_versao + 1;
    NEW.sql_atualizado_em := now();
    NEW.atualizado_em := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_etl_acoes_versionar_sql ON public.etl_acoes;
CREATE TRIGGER trg_etl_acoes_versionar_sql
  BEFORE UPDATE ON public.etl_acoes
  FOR EACH ROW
  EXECUTE FUNCTION public.etl_acoes_versionar_sql();
