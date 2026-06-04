
CREATE TABLE public.bi_user_slot_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  page_key text NOT NULL,
  slot_key text NOT NULL,
  mode text NOT NULL DEFAULT 'builtin',
  variant text,
  component_id text,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key, slot_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_user_slot_overrides TO authenticated;
GRANT ALL ON public.bi_user_slot_overrides TO service_role;

ALTER TABLE public.bi_user_slot_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own slot overrides"
  ON public.bi_user_slot_overrides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own slot overrides"
  ON public.bi_user_slot_overrides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own slot overrides"
  ON public.bi_user_slot_overrides FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own slot overrides"
  ON public.bi_user_slot_overrides FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_bi_user_slot_overrides_updated_at
  BEFORE UPDATE ON public.bi_user_slot_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
