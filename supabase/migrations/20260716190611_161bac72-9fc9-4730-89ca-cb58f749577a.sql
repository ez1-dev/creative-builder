
-- BI DRE tables: restrict SELECT to admins or users with BI access
DROP POLICY IF EXISTS "dre_depara_select_authenticated" ON public.bi_dre_depara_conta_ccu;
CREATE POLICY "dre_depara_select_bi" ON public.bi_dre_depara_conta_ccu
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "authenticated read bi_dre_estrutura" ON public.bi_dre_estrutura;
CREATE POLICY "read bi_dre_estrutura bi" ON public.bi_dre_estrutura
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "read estrutura v2" ON public.bi_dre_estrutura_v2;
CREATE POLICY "read estrutura v2 bi" ON public.bi_dre_estrutura_v2
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "read linha regra" ON public.bi_dre_linha_regra;
CREATE POLICY "read linha regra bi" ON public.bi_dre_linha_regra
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "authenticated read bi_dre_mascara" ON public.bi_dre_mascara;
CREATE POLICY "read bi_dre_mascara bi" ON public.bi_dre_mascara
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "read modelos" ON public.bi_dre_modelos;
CREATE POLICY "read modelos bi" ON public.bi_dre_modelos
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_bi_access(auth.uid()));

-- relatorio_publicacoes: restrict SELECT to admins or users with permission on the report
DROP POLICY IF EXISTS "Authenticated read publicacoes" ON public.relatorio_publicacoes;
CREATE POLICY "Read publicacoes scoped" ON public.relatorio_publicacoes
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.relatorio_permissoes rp
      JOIN public.user_access ua ON ua.profile_id = rp.profile_id
      JOIN public.profiles p ON upper(p.erp_user) = upper(ua.user_login)
      WHERE rp.relatorio_id = relatorio_publicacoes.relatorio_id
        AND p.id = auth.uid()
        AND rp.can_view = true
    )
  );
