CREATE TABLE public.bi_user_custom_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page_key text NOT NULL,
  metric_id text NOT NULL,
  label text NOT NULL,
  formula text NOT NULL,
  format text NOT NULL DEFAULT 'number',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key, metric_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_user_custom_metrics TO authenticated;
GRANT ALL ON public.bi_user_custom_metrics TO service_role;
ALTER TABLE public.bi_user_custom_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own metrics select" ON public.bi_user_custom_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own metrics insert" ON public.bi_user_custom_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own metrics update" ON public.bi_user_custom_metrics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own metrics delete" ON public.bi_user_custom_metrics FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_bi_user_custom_metrics_updated BEFORE UPDATE ON public.bi_user_custom_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();