
CREATE TABLE public.user_demo_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  hidden_modules text[] NOT NULL DEFAULT '{}',
  hidden_visuals text[] NOT NULL DEFAULT '{}',
  mask_names jsonb NOT NULL DEFAULT '{}'::jsonb,
  mask_values jsonb NOT NULL DEFAULT '{"mode":"keep","factor":1}'::jsonb,
  mask_docs jsonb NOT NULL DEFAULT '{}'::jsonb,
  text_replacements jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_demo_preferences TO authenticated;
GRANT ALL ON public.user_demo_preferences TO service_role;

ALTER TABLE public.user_demo_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own demo preferences"
  ON public.user_demo_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_demo_preferences_updated
  BEFORE UPDATE ON public.user_demo_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
