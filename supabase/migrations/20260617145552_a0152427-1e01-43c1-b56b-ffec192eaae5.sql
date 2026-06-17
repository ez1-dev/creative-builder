
-- Modelos DRE (versionamento rascunho/publicado)
CREATE TABLE public.bi_dre_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','arquivado')),
  versao integer NOT NULL DEFAULT 1,
  publicado_em timestamptz,
  publicado_por uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_dre_modelos TO authenticated;
GRANT ALL ON public.bi_dre_modelos TO service_role;
ALTER TABLE public.bi_dre_modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read modelos" ON public.bi_dre_modelos FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage modelos" ON public.bi_dre_modelos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER bi_dre_modelos_set_updated_at BEFORE UPDATE ON public.bi_dre_modelos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Estrutura de linhas por modelo
CREATE TABLE public.bi_dre_estrutura_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.bi_dre_modelos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  codigo_linha text NOT NULL,
  descricao text NOT NULL,
  nivel smallint NOT NULL DEFAULT 1,
  linha_pai_codigo text,
  tipo_linha text NOT NULL DEFAULT 'ANALITICA' CHECK (tipo_linha IN ('TITULO','ANALITICA','AGRUPADORA','TOTAL','CALCULO')),
  formula text,
  ativo boolean NOT NULL DEFAULT true,
  flag_soma boolean NOT NULL DEFAULT true,
  flag_inverte_sinal boolean NOT NULL DEFAULT false,
  flag_exibe_dre boolean NOT NULL DEFAULT true,
  flag_permite_drill boolean NOT NULL DEFAULT true,
  flag_negrito boolean NOT NULL DEFAULT false,
  flag_totalizadora boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (modelo_id, codigo_linha)
);
CREATE INDEX bi_dre_estrutura_v2_modelo_ordem_idx ON public.bi_dre_estrutura_v2(modelo_id, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_dre_estrutura_v2 TO authenticated;
GRANT ALL ON public.bi_dre_estrutura_v2 TO service_role;
ALTER TABLE public.bi_dre_estrutura_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read estrutura v2" ON public.bi_dre_estrutura_v2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage estrutura v2" ON public.bi_dre_estrutura_v2 FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER bi_dre_estrutura_v2_set_updated_at BEFORE UPDATE ON public.bi_dre_estrutura_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Regras por linha
CREATE TABLE public.bi_dre_linha_regra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.bi_dre_modelos(id) ON DELETE CASCADE,
  codigo_linha text NOT NULL,
  tipo_regra text NOT NULL CHECK (tipo_regra IN ('CONTA_CONTABIL','MASCARA_CONTA','CENTRO_CUSTOS','CENTRO_CUSTOS_3','ORIGEM','TRANSACAO','HISTORICO','COMBINACAO','EXCECAO_LANCAMENTO')),
  operador text NOT NULL DEFAULT '=' CHECK (operador IN ('=','LIKE','IN','<>')),
  valor text,
  cd_empresa text,
  cd_filial text,
  cd_conta_contabil text,
  cd_mascara text,
  cd_centro_custos text,
  cd_centro_custos_3 text,
  cd_origem_lcto text,
  cd_tns text,
  ds_historico text,
  sinal smallint NOT NULL DEFAULT 1 CHECK (sinal IN (-1,1)),
  prioridade integer NOT NULL DEFAULT 100,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bi_dre_linha_regra_modelo_linha_idx ON public.bi_dre_linha_regra(modelo_id, codigo_linha);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_dre_linha_regra TO authenticated;
GRANT ALL ON public.bi_dre_linha_regra TO service_role;
ALTER TABLE public.bi_dre_linha_regra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read linha regra" ON public.bi_dre_linha_regra FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage linha regra" ON public.bi_dre_linha_regra FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER bi_dre_linha_regra_set_updated_at BEFORE UPDATE ON public.bi_dre_linha_regra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auditoria
CREATE TABLE public.bi_dre_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade text NOT NULL,
  entidade_id text,
  acao text NOT NULL CHECK (acao IN ('CRIAR','EDITAR','INATIVAR','DUPLICAR','PUBLICAR','REORDENAR','VINCULAR','EXCLUIR')),
  payload_antes jsonb,
  payload_depois jsonb,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bi_dre_auditoria_entidade_idx ON public.bi_dre_auditoria(entidade, entidade_id, created_at DESC);
GRANT SELECT, INSERT ON public.bi_dre_auditoria TO authenticated;
GRANT ALL ON public.bi_dre_auditoria TO service_role;
ALTER TABLE public.bi_dre_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read auditoria" ON public.bi_dre_auditoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert auditoria" ON public.bi_dre_auditoria FOR INSERT TO authenticated WITH CHECK (true);
