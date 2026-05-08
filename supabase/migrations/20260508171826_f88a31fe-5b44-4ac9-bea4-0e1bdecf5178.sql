
-- Permitir editores de passagens gerenciarem widgets do dashboard padrão de passagens-aereas
CREATE POLICY "Passagens editors manage default passagens widgets"
ON public.dashboard_widgets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dashboards d
    WHERE d.id = dashboard_widgets.dashboard_id
      AND d.module = 'passagens-aereas'
      AND d.owner_id IS NULL
      AND public.can_edit_passagens(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dashboards d
    WHERE d.id = dashboard_widgets.dashboard_id
      AND d.module = 'passagens-aereas'
      AND d.owner_id IS NULL
      AND public.can_edit_passagens(auth.uid())
  )
);

-- Permitir editores de passagens atualizarem o dashboard padrão de passagens-aereas (caso necessário)
CREATE POLICY "Passagens editors manage default passagens dashboard"
ON public.dashboards
FOR ALL
TO authenticated
USING (
  module = 'passagens-aereas'
  AND owner_id IS NULL
  AND public.can_edit_passagens(auth.uid())
)
WITH CHECK (
  module = 'passagens-aereas'
  AND owner_id IS NULL
  AND public.can_edit_passagens(auth.uid())
);
