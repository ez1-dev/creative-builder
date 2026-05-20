-- =========================================================
-- Módulo: Desenvolvimento de Relatórios
-- =========================================================

-- 1) Tabela principal
CREATE TABLE public.relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  modulo text,
  categoria text,
  fonte_dados text,
  sql_query text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','inativo')),
  permite_excel boolean NOT NULL DEFAULT true,
  permite_pdf boolean NOT NULL DEFAULT true,
  permite_csv boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_relatorios_status ON public.relatorios(status);
CREATE INDEX idx_relatorios_modulo ON public.relatorios(modulo);

ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read publicados or admins read all"
ON public.relatorios FOR SELECT
TO authenticated
USING (status = 'publicado' OR public.is_admin(auth.uid()));

CREATE POLICY "Admins insert relatorios"
ON public.relatorios FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update relatorios"
ON public.relatorios FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete relatorios"
ON public.relatorios FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_relatorios_updated_at
BEFORE UPDATE ON public.relatorios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Parâmetros
CREATE TABLE public.relatorio_parametros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.relatorios(id) ON DELETE CASCADE,
  nome text NOT NULL,
  label text,
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto','numero','data','lista','booleano')),
  obrigatorio boolean NOT NULL DEFAULT false,
  valor_padrao text,
  ordem integer NOT NULL DEFAULT 0,
  sql_lista text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (relatorio_id, nome)
);
CREATE INDEX idx_rel_params_rel ON public.relatorio_parametros(relatorio_id);

ALTER TABLE public.relatorio_parametros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read params of visible relatorio"
ON public.relatorio_parametros FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.relatorios r
  WHERE r.id = relatorio_parametros.relatorio_id
    AND (r.status = 'publicado' OR public.is_admin(auth.uid()))
));

CREATE POLICY "Admins manage params"
ON public.relatorio_parametros FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 3) Colunas
CREATE TABLE public.relatorio_colunas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.relatorios(id) ON DELETE CASCADE,
  campo text NOT NULL,
  titulo text,
  visivel boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  tipo text,
  formato text,
  alinhamento text NOT NULL DEFAULT 'esquerda' CHECK (alinhamento IN ('esquerda','centro','direita')),
  totalizar boolean NOT NULL DEFAULT false,
  agrupar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (relatorio_id, campo)
);
CREATE INDEX idx_rel_cols_rel ON public.relatorio_colunas(relatorio_id);

ALTER TABLE public.relatorio_colunas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read cols of visible relatorio"
ON public.relatorio_colunas FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.relatorios r
  WHERE r.id = relatorio_colunas.relatorio_id
    AND (r.status = 'publicado' OR public.is_admin(auth.uid()))
));

CREATE POLICY "Admins manage cols"
ON public.relatorio_colunas FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4) Layout (1:1)
CREATE TABLE public.relatorio_layout (
  relatorio_id uuid PRIMARY KEY REFERENCES public.relatorios(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'tabela_simples'
    CHECK (tipo IN ('tabela_simples','tabela_agrupada','cards','grafico','tabela_grafico')),
  titulo text,
  subtitulo text,
  mostrar_filtros boolean NOT NULL DEFAULT true,
  mostrar_totais boolean NOT NULL DEFAULT true,
  mostrar_data_hora boolean NOT NULL DEFAULT true,
  mostrar_usuario boolean NOT NULL DEFAULT true,
  agrupar_por text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.relatorio_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read layout of visible relatorio"
ON public.relatorio_layout FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.relatorios r
  WHERE r.id = relatorio_layout.relatorio_id
    AND (r.status = 'publicado' OR public.is_admin(auth.uid()))
));

CREATE POLICY "Admins manage layout"
ON public.relatorio_layout FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_rel_layout_updated_at
BEFORE UPDATE ON public.relatorio_layout
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Execuções
CREATE TABLE public.relatorio_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.relatorios(id) ON DELETE CASCADE,
  executado_por uuid,
  executado_em timestamptz NOT NULL DEFAULT now(),
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  qtd_linhas integer,
  tempo_ms integer,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','erro')),
  erro text,
  formato text NOT NULL DEFAULT 'grid' CHECK (formato IN ('grid','excel','csv','pdf'))
);
CREATE INDEX idx_rel_exec_rel ON public.relatorio_execucoes(relatorio_id);
CREATE INDEX idx_rel_exec_user ON public.relatorio_execucoes(executado_por);
CREATE INDEX idx_rel_exec_data ON public.relatorio_execucoes(executado_em DESC);

ALTER TABLE public.relatorio_execucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own execucoes; admins read all"
ON public.relatorio_execucoes FOR SELECT
TO authenticated
USING (executado_por = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert execucoes of visible relatorio"
ON public.relatorio_execucoes FOR INSERT
TO authenticated
WITH CHECK (
  executado_por = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.relatorios r
    WHERE r.id = relatorio_execucoes.relatorio_id
      AND (r.status = 'publicado' OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Admins delete execucoes"
ON public.relatorio_execucoes FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
