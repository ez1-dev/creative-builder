
-- Scope sensitive BI reference tables to users with BI access
DROP POLICY IF EXISTS "Authenticated read bi_cliente" ON public.bi_cliente;
CREATE POLICY "BI users read bi_cliente" ON public.bi_cliente
  FOR SELECT TO authenticated
  USING (public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read bi_fornecedores" ON public.bi_fornecedores;
CREATE POLICY "BI users read bi_fornecedores" ON public.bi_fornecedores
  FOR SELECT TO authenticated
  USING (public.has_bi_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read bi_projetos" ON public.bi_projetos;
CREATE POLICY "BI users read bi_projetos" ON public.bi_projetos
  FOR SELECT TO authenticated
  USING (public.has_bi_access(auth.uid()));

-- Scope reseller data to BI users
DROP POLICY IF EXISTS "bi_revenda_select_authenticated" ON public.bi_revenda;
CREATE POLICY "BI users read bi_revenda" ON public.bi_revenda
  FOR SELECT TO authenticated
  USING (public.has_bi_access(auth.uid()));

-- Make SELECT scoping explicit on share link tables (managers only via RLS;
-- public token validation happens through service-role edge functions).
CREATE POLICY "Managers read frota share links" ON public.manutencao_frota_share_links
  FOR SELECT TO authenticated
  USING (public.can_manage_frota_share(auth.uid()));

CREATE POLICY "Managers read passagens share links" ON public.passagens_aereas_share_links
  FOR SELECT TO authenticated
  USING (public.can_manage_passagens_share(auth.uid()));
