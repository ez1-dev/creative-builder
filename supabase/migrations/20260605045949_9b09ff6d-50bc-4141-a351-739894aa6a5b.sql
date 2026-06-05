ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS bi_display_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;