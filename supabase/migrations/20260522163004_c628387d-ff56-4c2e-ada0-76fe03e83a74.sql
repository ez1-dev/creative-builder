
ALTER TABLE public.relatorio_colunas
  ADD COLUMN IF NOT EXISTS visivel_excel boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visivel_pdf boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS permite_ordenar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS permite_filtrar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS regra_condicional_json jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.relatorio_layout
  ADD COLUMN IF NOT EXISTS congelar_colunas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paginacao boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS por_pagina integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS ordenacao_padrao jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS destaques_json jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.relatorios
  ADD COLUMN IF NOT EXISTS versao_atual integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS icone text,
  ADD COLUMN IF NOT EXISTS permite_impressao boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.relatorio_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL,
  versao integer NOT NULL,
  sql_base text NOT NULL DEFAULT '',
  parametros_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  colunas_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  layout_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacao text,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (relatorio_id, versao)
);
CREATE INDEX IF NOT EXISTS idx_relatorio_versoes_rel ON public.relatorio_versoes(relatorio_id);
ALTER TABLE public.relatorio_versoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage versoes" ON public.relatorio_versoes;
CREATE POLICY "Admins manage versoes" ON public.relatorio_versoes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Read versoes of visible relatorio" ON public.relatorio_versoes;
CREATE POLICY "Read versoes of visible relatorio" ON public.relatorio_versoes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.relatorios r
    WHERE r.id = relatorio_versoes.relatorio_id
      AND (r.status = 'publicado' OR public.is_admin(auth.uid()))
  ));

CREATE TABLE IF NOT EXISTS public.relatorio_publicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL,
  versao_id uuid,
  modulo text,
  menu_path text,
  ativo boolean NOT NULL DEFAULT true,
  publicado_por uuid,
  publicado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_relatorio_publicacoes_rel ON public.relatorio_publicacoes(relatorio_id);
ALTER TABLE public.relatorio_publicacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage publicacoes" ON public.relatorio_publicacoes;
CREATE POLICY "Admins manage publicacoes" ON public.relatorio_publicacoes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read publicacoes" ON public.relatorio_publicacoes;
CREATE POLICY "Authenticated read publicacoes" ON public.relatorio_publicacoes
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.relatorio_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_export boolean NOT NULL DEFAULT true,
  can_print boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (relatorio_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_relatorio_permissoes_rel ON public.relatorio_permissoes(relatorio_id);
ALTER TABLE public.relatorio_permissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage permissoes" ON public.relatorio_permissoes;
CREATE POLICY "Admins manage permissoes" ON public.relatorio_permissoes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read permissoes" ON public.relatorio_permissoes;
CREATE POLICY "Authenticated read permissoes" ON public.relatorio_permissoes
  FOR SELECT TO authenticated USING (true);
