-- 1) Tabela de prioridade manual por OP
CREATE TABLE IF NOT EXISTS public.producao_prioridade_op (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codemp integer NOT NULL,
  numorp text NOT NULL,
  prioridade integer NOT NULL DEFAULT 1,
  observacao text,
  atualizado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT producao_prioridade_op_uk UNIQUE (codemp, numorp)
);

ALTER TABLE public.producao_prioridade_op ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read producao_prioridade_op"
  ON public.producao_prioridade_op FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage producao_prioridade_op"
  ON public.producao_prioridade_op FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_producao_prioridade_op_updated_at
  BEFORE UPDATE ON public.producao_prioridade_op
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Índice único para upsert da sincronização ERP -> bi_ops_fila
CREATE UNIQUE INDEX IF NOT EXISTS bi_ops_fila_uk_codemp_numorp_codopr
  ON public.bi_ops_fila (codemp, numorp, COALESCE(codopr, ''));