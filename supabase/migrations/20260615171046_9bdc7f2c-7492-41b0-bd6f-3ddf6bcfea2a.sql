
-- ============ Tabelas analíticas da Contabilidade ============

-- 1) bi_vm_orc_dre (fato — orçamento DRE)
CREATE TABLE IF NOT EXISTS public.bi_vm_orc_dre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cd_empresa int,
  cd_filial int,
  anomes_referente int,
  mascara text,
  descricao_linha text,
  unidade_negocio text,
  centro_custo text,
  vl_orcado numeric(18,2),
  extras jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bi_vm_orc_dre_emp_periodo_idx
  ON public.bi_vm_orc_dre (cd_empresa, anomes_referente);
GRANT SELECT ON public.bi_vm_orc_dre TO authenticated;
GRANT ALL ON public.bi_vm_orc_dre TO service_role;
ALTER TABLE public.bi_vm_orc_dre ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read bi_vm_orc_dre"
  ON public.bi_vm_orc_dre FOR SELECT TO authenticated USING (true);

-- 2) bi_vm_lanc_contabil (fato — lançamentos contábeis)
CREATE TABLE IF NOT EXISTS public.bi_vm_lanc_contabil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cd_empresa int,
  cd_filial int,
  anomes_referente int,
  cd_conta text,
  mascara text,
  centro_custo text,
  unidade_negocio text,
  vl_debito numeric(18,2),
  vl_credito numeric(18,2),
  vl_saldo numeric(18,2),
  extras jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bi_vm_lanc_contabil_emp_periodo_idx
  ON public.bi_vm_lanc_contabil (cd_empresa, anomes_referente);
GRANT SELECT ON public.bi_vm_lanc_contabil TO authenticated;
GRANT ALL ON public.bi_vm_lanc_contabil TO service_role;
ALTER TABLE public.bi_vm_lanc_contabil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read bi_vm_lanc_contabil"
  ON public.bi_vm_lanc_contabil FOR SELECT TO authenticated USING (true);

-- 3) bi_etl_v_balanco_patrimonial (fato — balanço patrimonial)
CREATE TABLE IF NOT EXISTS public.bi_etl_v_balanco_patrimonial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cd_empresa int,
  cd_filial int,
  anomes_referente int,
  cd_conta text,
  mascara text,
  descricao_conta text,
  grupo text,
  vl_saldo numeric(18,2),
  extras jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bi_etl_v_balanco_patrimonial_emp_periodo_idx
  ON public.bi_etl_v_balanco_patrimonial (cd_empresa, anomes_referente);
GRANT SELECT ON public.bi_etl_v_balanco_patrimonial TO authenticated;
GRANT ALL ON public.bi_etl_v_balanco_patrimonial TO service_role;
ALTER TABLE public.bi_etl_v_balanco_patrimonial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read bi_etl_v_balanco_patrimonial"
  ON public.bi_etl_v_balanco_patrimonial FOR SELECT TO authenticated USING (true);

-- 4) bi_dre_estrutura (configuração — hierarquia das linhas da DRE)
CREATE TABLE IF NOT EXISTS public.bi_dre_estrutura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem int NOT NULL DEFAULT 0,
  mascara text NOT NULL UNIQUE,
  descricao text NOT NULL,
  totalizadora boolean NOT NULL DEFAULT false,
  sinal smallint NOT NULL DEFAULT 1,
  nivel smallint NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bi_dre_estrutura TO authenticated;
GRANT ALL ON public.bi_dre_estrutura TO service_role;
ALTER TABLE public.bi_dre_estrutura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read bi_dre_estrutura"
  ON public.bi_dre_estrutura FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage bi_dre_estrutura"
  ON public.bi_dre_estrutura FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 5) bi_dre_mascara (de→para conta→máscara DRE)
CREATE TABLE IF NOT EXISTS public.bi_dre_mascara (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cd_conta text NOT NULL,
  mascara text NOT NULL,
  unidade_negocio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bi_dre_mascara_conta_un_idx
  ON public.bi_dre_mascara (cd_conta, COALESCE(unidade_negocio, ''));
GRANT SELECT ON public.bi_dre_mascara TO authenticated;
GRANT ALL ON public.bi_dre_mascara TO service_role;
ALTER TABLE public.bi_dre_mascara ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read bi_dre_mascara"
  ON public.bi_dre_mascara FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage bi_dre_mascara"
  ON public.bi_dre_mascara FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Triggers updated_at
CREATE TRIGGER bi_vm_orc_dre_set_updated_at
  BEFORE UPDATE ON public.bi_vm_orc_dre
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bi_vm_lanc_contabil_set_updated_at
  BEFORE UPDATE ON public.bi_vm_lanc_contabil
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bi_etl_v_balanco_patrimonial_set_updated_at
  BEFORE UPDATE ON public.bi_etl_v_balanco_patrimonial
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bi_dre_estrutura_set_updated_at
  BEFORE UPDATE ON public.bi_dre_estrutura
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bi_dre_mascara_set_updated_at
  BEFORE UPDATE ON public.bi_dre_mascara
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
