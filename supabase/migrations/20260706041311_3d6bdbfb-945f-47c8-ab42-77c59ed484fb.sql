
-- Helper: user has access to any /bi/* screen, or is admin
CREATE OR REPLACE FUNCTION public.has_bi_access(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_uid) OR EXISTS (
    SELECT 1
    FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
    JOIN public.profile_screens ps ON ps.profile_id = ua.profile_id
    WHERE p.id = _uid
      AND ps.screen_path LIKE '/bi/%'
  );
$$;

-- BI business tables: scope reads to BI-access users
DROP POLICY IF EXISTS "Authenticated read bi_compras" ON public.bi_compras;
CREATE POLICY "BI users read bi_compras" ON public.bi_compras
  FOR SELECT TO authenticated USING (public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read bi_recebimentos" ON public.bi_recebimentos;
CREATE POLICY "BI users read bi_recebimentos" ON public.bi_recebimentos
  FOR SELECT TO authenticated USING (public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read bi_faturamento" ON public.bi_faturamento;
CREATE POLICY "BI users read bi_faturamento" ON public.bi_faturamento
  FOR SELECT TO authenticated USING (public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "authenticated read bi_etl_v_balanco_patrimonial" ON public.bi_etl_v_balanco_patrimonial;
CREATE POLICY "BI users read bi_etl_v_balanco_patrimonial" ON public.bi_etl_v_balanco_patrimonial
  FOR SELECT TO authenticated USING (public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "authenticated read bi_vm_lanc_contabil" ON public.bi_vm_lanc_contabil;
CREATE POLICY "BI users read bi_vm_lanc_contabil" ON public.bi_vm_lanc_contabil
  FOR SELECT TO authenticated USING (public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "authenticated read bi_vm_orc_dre" ON public.bi_vm_orc_dre;
CREATE POLICY "BI users read bi_vm_orc_dre" ON public.bi_vm_orc_dre
  FOR SELECT TO authenticated USING (public.has_bi_access(auth.uid()));

-- DRE tables: admin-only reads
DROP POLICY IF EXISTS "read auditoria" ON public.bi_dre_auditoria;
CREATE POLICY "admin read auditoria" ON public.bi_dre_auditoria
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "auth read classificacoes" ON public.bi_dre_classificacoes;
CREATE POLICY "admin read classificacoes" ON public.bi_dre_classificacoes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Autenticados leem excecoes DRE" ON public.bi_dre_excecoes;
CREATE POLICY "Admin le excecoes DRE" ON public.bi_dre_excecoes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ETL operational tables: admin-only reads
DROP POLICY IF EXISTS "Authenticated read etl_execucoes" ON public.etl_execucoes;
CREATE POLICY "Admins read etl_execucoes" ON public.etl_execucoes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read etl_acao_execucoes" ON public.etl_acao_execucoes;
CREATE POLICY "Admins read etl_acao_execucoes" ON public.etl_acao_execucoes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read etl_logs" ON public.etl_logs;
CREATE POLICY "Admins read etl_logs" ON public.etl_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read etl_fila" ON public.etl_fila_integrador;
CREATE POLICY "Admins read etl_fila" ON public.etl_fila_integrador
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read etl_tarefas" ON public.etl_tarefas;
CREATE POLICY "Admins read etl_tarefas" ON public.etl_tarefas
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read etl_configuracoes_bi" ON public.etl_configuracoes_bi;
CREATE POLICY "Admins read etl_configuracoes_bi" ON public.etl_configuracoes_bi
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- dashboard_cache: replace always-true write policies with authenticated-session checks
DROP POLICY IF EXISTS "Authenticated write dashboard_cache" ON public.dashboard_cache;
CREATE POLICY "Authenticated write dashboard_cache" ON public.dashboard_cache
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update dashboard_cache" ON public.dashboard_cache;
CREATE POLICY "Authenticated update dashboard_cache" ON public.dashboard_cache
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated delete dashboard_cache" ON public.dashboard_cache;
CREATE POLICY "Authenticated delete dashboard_cache" ON public.dashboard_cache
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
