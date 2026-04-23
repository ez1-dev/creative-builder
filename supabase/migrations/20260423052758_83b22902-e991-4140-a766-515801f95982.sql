ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS ai_assistant_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;