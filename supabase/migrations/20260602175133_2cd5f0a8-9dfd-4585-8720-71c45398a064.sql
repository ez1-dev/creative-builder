
-- =====================================================================
-- Central ETL — schema novo
-- =====================================================================

-- Drop em ordem (respeitando FKs antigas)
DROP TABLE IF EXISTS public.etl_logs CASCADE;
DROP TABLE IF EXISTS public.etl_fila_integrador CASCADE;
DROP TABLE IF EXISTS public.etl_execucoes CASCADE;
DROP TABLE IF EXISTS public.etl_tarefas CASCADE;

-- ----- etl_tarefas -----
CREATE TABLE public.etl_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo text NOT NULL DEFAULT 'GERAL',
  nome_tarefa text NOT NULL UNIQUE,
  descricao text,
  ativa boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  status_atual text NOT NULL DEFAULT 'PENDENTE',
  ultima_execucao_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etl_tarefas TO authenticated;
GRANT ALL ON public.etl_tarefas TO service_role;
ALTER TABLE public.etl_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read etl_tarefas" ON public.etl_tarefas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage etl_tarefas" ON public.etl_tarefas FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ----- etl_acoes -----
CREATE TABLE public.etl_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.etl_tarefas(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  id_acao text NOT NULL,
  nome_acao text,
  tipo_execucao text NOT NULL DEFAULT 'API',
  tipo_comando text NOT NULL DEFAULT 'FUNCAO',
  endpoint_api text,
  tabela_destino text,
  estrategia_carga text NOT NULL DEFAULT 'REPLACE_PERIODO',
  caso_erro text NOT NULL DEFAULT 'PARAR',
  ativa boolean NOT NULL DEFAULT true,
  timeout_segundos integer NOT NULL DEFAULT 900,
  parametros_padrao jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tarefa_id, id_acao)
);
CREATE INDEX idx_etl_acoes_tarefa ON public.etl_acoes(tarefa_id, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etl_acoes TO authenticated;
GRANT ALL ON public.etl_acoes TO service_role;
ALTER TABLE public.etl_acoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read etl_acoes" ON public.etl_acoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage etl_acoes" ON public.etl_acoes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ----- etl_execucoes -----
CREATE TABLE public.etl_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES public.etl_tarefas(id) ON DELETE SET NULL,
  nome_tarefa text NOT NULL,
  status text NOT NULL DEFAULT 'PENDENTE',
  acionado_por text,
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  iniciado_em timestamptz,
  finalizado_em timestamptz,
  total_linhas integer NOT NULL DEFAULT 0,
  mensagem text,
  erro text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_etl_execucoes_tarefa ON public.etl_execucoes(tarefa_id, criado_em DESC);
CREATE INDEX idx_etl_execucoes_nome ON public.etl_execucoes(nome_tarefa, criado_em DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etl_execucoes TO authenticated;
GRANT ALL ON public.etl_execucoes TO service_role;
ALTER TABLE public.etl_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read etl_execucoes" ON public.etl_execucoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage etl_execucoes" ON public.etl_execucoes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ----- etl_acao_execucoes -----
CREATE TABLE public.etl_acao_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id uuid NOT NULL REFERENCES public.etl_execucoes(id) ON DELETE CASCADE,
  acao_id uuid REFERENCES public.etl_acoes(id) ON DELETE SET NULL,
  id_acao text NOT NULL,
  ordem integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDENTE',
  iniciado_em timestamptz,
  finalizado_em timestamptz,
  total_linhas integer NOT NULL DEFAULT 0,
  mensagem text,
  erro text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_etl_acao_execucoes_execucao ON public.etl_acao_execucoes(execucao_id, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etl_acao_execucoes TO authenticated;
GRANT ALL ON public.etl_acao_execucoes TO service_role;
ALTER TABLE public.etl_acao_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read etl_acao_execucoes" ON public.etl_acao_execucoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage etl_acao_execucoes" ON public.etl_acao_execucoes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ----- etl_logs -----
CREATE TABLE public.etl_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id uuid REFERENCES public.etl_execucoes(id) ON DELETE CASCADE,
  acao_execucao_id uuid REFERENCES public.etl_acao_execucoes(id) ON DELETE CASCADE,
  nivel text NOT NULL DEFAULT 'INFO',
  origem text,
  mensagem text NOT NULL,
  detalhe jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_etl_logs_execucao ON public.etl_logs(execucao_id, criado_em);
CREATE INDEX idx_etl_logs_acao_exec ON public.etl_logs(acao_execucao_id, criado_em);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etl_logs TO authenticated;
GRANT ALL ON public.etl_logs TO service_role;
ALTER TABLE public.etl_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read etl_logs" ON public.etl_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage etl_logs" ON public.etl_logs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ----- etl_fila_integrador -----
CREATE TABLE public.etl_fila_integrador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_tarefa text NOT NULL,
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDENTE',
  tentativas integer NOT NULL DEFAULT 0,
  mensagem text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz
);
CREATE INDEX idx_etl_fila_status ON public.etl_fila_integrador(status, criado_em);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etl_fila_integrador TO authenticated;
GRANT ALL ON public.etl_fila_integrador TO service_role;
ALTER TABLE public.etl_fila_integrador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read etl_fila" ON public.etl_fila_integrador FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage etl_fila" ON public.etl_fila_integrador FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =====================================================================
-- bi_faturamento
-- =====================================================================
CREATE TABLE public.bi_faturamento (
  id text PRIMARY KEY,
  cd_tp_movimento text,
  cd_origem text,
  cd_empresa text,
  cd_filial text,
  id_nf text,
  cd_nf text,
  cd_serie text,
  dt_emissao date,
  ano_emissao text,
  anomes_emissao text,
  mes_emissao text,
  dia_emissao text,
  cd_estado text,
  cd_cidade text,
  cd_natureza text,
  cd_tns text,
  cd_representante text,
  cd_grupo_cliente text,
  cd_rev_pedido text,
  cd_cliente text,
  cd_centro_custos text,
  cd_centro_custos_1 text,
  cd_centro_custos_2 text,
  cd_centro_custos_3 text,
  cd_prj text,
  ds_abr_prj text,
  cd_fpj text,
  ds_abr_fpj text,
  cd_pedido text,
  cd_cif_fob text,
  cd_transportadora text,
  cd_familia text,
  cd_agrupamento text,
  cd_produto text,
  cd_derivacao text,
  cd_unidade_medida text,
  vl_peso_bruto numeric,
  vl_peso_liquido numeric,
  qtd_produtos numeric,
  vl_bruto numeric,
  vl_total numeric,
  vl_comissao numeric,
  vl_desconto numeric,
  vl_icms numeric,
  vl_difal numeric,
  vl_ipi numeric,
  vl_cofins numeric,
  vl_pis numeric,
  vl_iss numeric,
  vl_amostra numeric,
  vl_bonificacao numeric,
  vl_frete numeric,
  vl_ismsst numeric,
  vl_custo numeric,
  vl_devolucao numeric,
  vl_meta numeric,
  carga_id uuid,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bi_fat_anomes ON public.bi_faturamento(anomes_emissao);
CREATE INDEX idx_bi_fat_cliente ON public.bi_faturamento(cd_cliente);
CREATE INDEX idx_bi_fat_produto ON public.bi_faturamento(cd_produto);
CREATE INDEX idx_bi_fat_origem ON public.bi_faturamento(cd_origem);
CREATE INDEX idx_bi_fat_tpmov ON public.bi_faturamento(cd_tp_movimento);
CREATE INDEX idx_bi_fat_filial ON public.bi_faturamento(cd_filial);

GRANT SELECT ON public.bi_faturamento TO authenticated;
GRANT ALL ON public.bi_faturamento TO service_role;
ALTER TABLE public.bi_faturamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read bi_faturamento" ON public.bi_faturamento FOR SELECT TO authenticated USING (true);
