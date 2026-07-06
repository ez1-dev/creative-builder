GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_cache TO authenticated;
GRANT ALL ON public.dashboard_cache TO service_role;

CREATE POLICY "Authenticated write dashboard_cache"
  ON public.dashboard_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update dashboard_cache"
  ON public.dashboard_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete dashboard_cache"
  ON public.dashboard_cache FOR DELETE TO authenticated USING (true);