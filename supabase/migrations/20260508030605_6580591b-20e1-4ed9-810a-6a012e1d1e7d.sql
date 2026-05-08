
-- =========================================================
-- DIMENSÕES BI
-- =========================================================
CREATE TABLE public.bi_fornecedores (
  codigo text PRIMARY KEY,
  nome text,
  cnpj text,
  uf text,
  cidade text,
  ativo boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bi_projetos (
  numero_projeto text PRIMARY KEY,
  nome_projeto text,
  projeto_macro text,
  cliente text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bi_projetos_macro ON public.bi_projetos(projeto_macro);

CREATE TABLE public.bi_centros_custo (
  codigo text PRIMARY KEY,
  descricao text,
  responsavel text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bi_tipo_despesa (
  codigo text PRIMARY KEY,
  label text NOT NULL,
  regra_origem text NOT NULL DEFAULT 'erp',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- FATO: bi_compras
-- =========================================================
CREATE TABLE public.bi_compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_oc text NOT NULL,
  sequencia_item integer NOT NULL,
  codigo_item text,
  descricao_item text,
  tipo_item text,
  origem_material text,
  codigo_familia text,
  codigo_fornecedor text,
  nome_fornecedor text,
  numero_projeto text,
  nome_projeto text,
  projeto_macro text,
  centro_custo text,
  tipo_despesa text,
  tipo_despesa_calc text,
  data_emissao date,
  data_entrega date,
  mes_competencia text,
  condicao_pagamento text,
  quantidade numeric(18,4) DEFAULT 0,
  quantidade_recebida numeric(18,4) DEFAULT 0,
  saldo_pendente numeric(18,4) DEFAULT 0,
  preco_unitario numeric(18,6) DEFAULT 0,
  valor_bruto numeric(18,2) DEFAULT 0,
  valor_liquido numeric(18,2) DEFAULT 0,
  valor_recebido numeric(18,2) DEFAULT 0,
  valor_pendente numeric(18,2) DEFAULT 0,
  situacao_oc text,
  codigo_motivo_oc text,
  observacao_oc text,
  erp_updated_at timestamptz,
  etl_updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bi_compras_oc_item_unique UNIQUE (numero_oc, sequencia_item)
);
CREATE INDEX idx_bi_compras_data_emissao ON public.bi_compras(data_emissao);
CREATE INDEX idx_bi_compras_fornecedor ON public.bi_compras(codigo_fornecedor);
CREATE INDEX idx_bi_compras_projeto ON public.bi_compras(numero_projeto);
CREATE INDEX idx_bi_compras_macro ON public.bi_compras(projeto_macro);
CREATE INDEX idx_bi_compras_tipo_despesa ON public.bi_compras(tipo_despesa);
CREATE INDEX idx_bi_compras_mes ON public.bi_compras(mes_competencia);
CREATE INDEX idx_bi_compras_numero_oc ON public.bi_compras(numero_oc);

-- =========================================================
-- FATO: bi_recebimentos
-- =========================================================
CREATE TABLE public.bi_recebimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_nf text NOT NULL,
  serie text,
  sequencia_item integer NOT NULL,
  codigo_item text,
  descricao_item text,
  numero_oc_origem text,
  sequencia_oc_origem integer,
  codigo_fornecedor text,
  nome_fornecedor text,
  numero_projeto text,
  nome_projeto text,
  projeto_macro text,
  centro_custo text,
  tipo_despesa text,
  tipo_despesa_calc text,
  data_emissao_nf date,
  data_recebimento date,
  mes_competencia text,
  quantidade numeric(18,4) DEFAULT 0,
  valor_bruto numeric(18,2) DEFAULT 0,
  valor_liquido numeric(18,2) DEFAULT 0,
  tipo_movimento text NOT NULL DEFAULT 'RECEBIMENTO',
  cancelada boolean NOT NULL DEFAULT false,
  estornada boolean NOT NULL DEFAULT false,
  erp_updated_at timestamptz,
  etl_updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bi_recebimentos_nf_item_unique UNIQUE (numero_nf, serie, sequencia_item, codigo_fornecedor)
);
CREATE INDEX idx_bi_receb_data ON public.bi_recebimentos(data_recebimento);
CREATE INDEX idx_bi_receb_nf ON public.bi_recebimentos(numero_nf);
CREATE INDEX idx_bi_receb_oc ON public.bi_recebimentos(numero_oc_origem);
CREATE INDEX idx_bi_receb_forn ON public.bi_recebimentos(codigo_fornecedor);
CREATE INDEX idx_bi_receb_macro ON public.bi_recebimentos(projeto_macro);
CREATE INDEX idx_bi_receb_tipo_mov ON public.bi_recebimentos(tipo_movimento);

-- =========================================================
-- CACHE de dashboard
-- =========================================================
CREATE TABLE public.dashboard_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  filtros_hash text,
  valid_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dashboard_cache_valid_until ON public.dashboard_cache(valid_until);

-- =========================================================
-- ETL: conexões, tarefas, execuções, logs, watermark, fila
-- =========================================================
CREATE TABLE public.etl_conexoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  tipo text NOT NULL,
  host text,
  porta integer,
  database text,
  usuario text,
  secret_key text,
  enabled boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.etl_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  cron text,
  enabled boolean NOT NULL DEFAULT true,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  conexao_id uuid REFERENCES public.etl_conexoes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.etl_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES public.etl_tarefas(id) ON DELETE SET NULL,
  tarefa_codigo text NOT NULL,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  terminado_em timestamptz,
  status text NOT NULL DEFAULT 'RUNNING',
  linhas_lidas integer DEFAULT 0,
  linhas_inseridas integer DEFAULT 0,
  linhas_atualizadas integer DEFAULT 0,
  linhas_rejeitadas integer DEFAULT 0,
  erro_resumo text,
  params_executados jsonb DEFAULT '{}'::jsonb,
  acionado_por text NOT NULL DEFAULT 'SCHEDULER',
  user_id uuid
);
CREATE INDEX idx_etl_execucoes_tarefa ON public.etl_execucoes(tarefa_codigo, iniciado_em DESC);
CREATE INDEX idx_etl_execucoes_status ON public.etl_execucoes(status);

CREATE TABLE public.etl_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id uuid REFERENCES public.etl_execucoes(id) ON DELETE CASCADE,
  nivel text NOT NULL DEFAULT 'INFO',
  mensagem text NOT NULL,
  contexto jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_etl_logs_exec ON public.etl_logs(execucao_id, created_at);

CREATE TABLE public.etl_watermark (
  tarefa_codigo text PRIMARY KEY,
  ultimo_valor text,
  tipo text NOT NULL DEFAULT 'TIMESTAMP',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.etl_fila_integrador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_codigo text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  prioridade integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'PENDENTE',
  execucao_id uuid REFERENCES public.etl_execucoes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  picked_at timestamptz,
  finished_at timestamptz,
  created_by uuid
);
CREATE INDEX idx_etl_fila_status ON public.etl_fila_integrador(status, prioridade, created_at);

-- =========================================================
-- TRIGGERS updated_at
-- =========================================================
CREATE TRIGGER trg_bi_fornecedores_updated_at BEFORE UPDATE ON public.bi_fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bi_projetos_updated_at BEFORE UPDATE ON public.bi_projetos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bi_centros_custo_updated_at BEFORE UPDATE ON public.bi_centros_custo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bi_tipo_despesa_updated_at BEFORE UPDATE ON public.bi_tipo_despesa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_etl_conexoes_updated_at BEFORE UPDATE ON public.etl_conexoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_etl_tarefas_updated_at BEFORE UPDATE ON public.etl_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_etl_watermark_updated_at BEFORE UPDATE ON public.etl_watermark
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.bi_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_tipo_despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etl_conexoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etl_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etl_execucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etl_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etl_watermark ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etl_fila_integrador ENABLE ROW LEVEL SECURITY;

-- BI: leitura para autenticados; escrita só service role (sem policy = bloqueado)
CREATE POLICY "Authenticated read bi_fornecedores" ON public.bi_fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read bi_projetos" ON public.bi_projetos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read bi_centros_custo" ON public.bi_centros_custo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read bi_tipo_despesa" ON public.bi_tipo_despesa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read bi_compras" ON public.bi_compras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read bi_recebimentos" ON public.bi_recebimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read dashboard_cache" ON public.dashboard_cache FOR SELECT TO authenticated USING (true);

-- ETL: tudo só admin
CREATE POLICY "Admins manage etl_conexoes" ON public.etl_conexoes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage etl_tarefas" ON public.etl_tarefas FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage etl_execucoes" ON public.etl_execucoes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage etl_logs" ON public.etl_logs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage etl_watermark" ON public.etl_watermark FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage etl_fila" ON public.etl_fila_integrador FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- SEED inicial
-- =========================================================
INSERT INTO public.bi_tipo_despesa (codigo, label, regra_origem) VALUES
  ('MATERIA_PRIMA',   'Matéria-prima',   'calculada'),
  ('USO_CONSUMO',     'Uso e consumo',   'calculada'),
  ('DESPESAS_GERAIS', 'Despesas gerais', 'calculada'),
  ('SERVICOS',        'Serviços',        'calculada')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.etl_tarefas (codigo, nome, descricao, cron, enabled, params) VALUES
  ('ATU_COMPRAS',      'Atualizar Compras',      'Carga incremental de itens de OC do ERP para bi_compras',           '*/15 * * * *', true, '{"batch_size":2000,"janela_dias":7}'::jsonb),
  ('ATU_RECEBIMENTOS', 'Atualizar Recebimentos', 'Carga incremental de itens de NF de entrada do ERP para bi_recebimentos','*/15 * * * *', true, '{"batch_size":2000,"janela_dias":7}'::jsonb)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.etl_watermark (tarefa_codigo, ultimo_valor, tipo) VALUES
  ('ATU_COMPRAS',      NULL, 'TIMESTAMP'),
  ('ATU_RECEBIMENTOS', NULL, 'TIMESTAMP')
ON CONFLICT (tarefa_codigo) DO NOTHING;
