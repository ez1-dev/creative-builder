
CREATE TABLE public.bi_user_filter_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_key text NOT NULL,
  nome text NOT NULL,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_user_filter_presets TO authenticated;
GRANT ALL ON public.bi_user_filter_presets TO service_role;

ALTER TABLE public.bi_user_filter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own filter presets"
  ON public.bi_user_filter_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_bi_user_filter_presets_lookup
  ON public.bi_user_filter_presets (user_id, page_key);

CREATE TRIGGER bi_user_filter_presets_updated_at
  BEFORE UPDATE ON public.bi_user_filter_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bi_user_filter_presets_single_default()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.bi_user_filter_presets
      SET is_default = false
      WHERE user_id = NEW.user_id
        AND page_key = NEW.page_key
        AND id <> NEW.id
        AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bi_user_filter_presets_single_default_tg
  AFTER INSERT OR UPDATE OF is_default ON public.bi_user_filter_presets
  FOR EACH ROW EXECUTE FUNCTION public.bi_user_filter_presets_single_default();
