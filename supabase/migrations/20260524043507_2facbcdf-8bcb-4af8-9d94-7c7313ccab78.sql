
-- ============================================================
-- FASE 1: Base de dados APS - Entregas Programadas e Lead Times
-- ============================================================

-- ===== producao_entrega_programada =====
CREATE TABLE IF NOT EXISTS public.producao_entrega_programada (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codemp integer NOT NULL,
  tipo_entrega text NOT NULL DEFAULT 'OP',
  numorp text,
  numprj text,
  codori text,
  codpro text,
  descricao text,
  data_entrega date NOT NULL,
  prioridade integer NOT NULL DEFAULT 999,
  cliente text,
  obra text,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT producao_entrega_tipo_chk
    CHECK (tipo_entrega IN ('OP','OBRA','PROJETO','PRODUTO'))
);

CREATE INDEX IF NOT EXISTS idx_prod_entrega_codemp ON public.producao_entrega_programada(codemp);
CREATE INDEX IF NOT EXISTS idx_prod_entrega_data ON public.producao_entrega_programada(data_entrega);
CREATE INDEX IF NOT EXISTS idx_prod_entrega_tipo ON public.producao_entrega_programada(tipo_entrega);
CREATE INDEX IF NOT EXISTS idx_prod_entrega_numorp ON public.producao_entrega_programada(numorp);
CREATE INDEX IF NOT EXISTS idx_prod_entrega_numprj ON public.producao_entrega_programada(numprj);

ALTER TABLE public.producao_entrega_programada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read producao_entrega_programada"
  ON public.producao_entrega_programada FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage producao_entrega_programada"
  ON public.producao_entrega_programada FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_prod_entrega_updated_at
  BEFORE UPDATE ON public.producao_entrega_programada
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ===== producao_leadtime_etapa =====
CREATE TABLE IF NOT EXISTS public.producao_leadtime_etapa (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codemp integer NOT NULL,
  codcre text,
  codopr text,
  unidade_negocio text,
  tipo_recurso text,
  leadtime_fixo_dias numeric(18,2) NOT NULL DEFAULT 0,
  folga_seguranca_dias numeric(18,2) NOT NULL DEFAULT 0,
  considerar_no_calculo boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  obs text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prod_lt_codemp ON public.producao_leadtime_etapa(codemp);
CREATE INDEX IF NOT EXISTS idx_prod_lt_codcre ON public.producao_leadtime_etapa(codcre);
CREATE INDEX IF NOT EXISTS idx_prod_lt_codopr ON public.producao_leadtime_etapa(codopr);
CREATE INDEX IF NOT EXISTS idx_prod_lt_unidade ON public.producao_leadtime_etapa(unidade_negocio);

ALTER TABLE public.producao_leadtime_etapa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read producao_leadtime_etapa"
  ON public.producao_leadtime_etapa FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage producao_leadtime_etapa"
  ON public.producao_leadtime_etapa FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_prod_leadtime_updated_at
  BEFORE UPDATE ON public.producao_leadtime_etapa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
