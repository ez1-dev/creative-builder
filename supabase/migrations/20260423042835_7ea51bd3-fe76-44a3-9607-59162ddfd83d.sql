-- Tabela de sessões (presença online)
CREATE TABLE public.user_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  display_name text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  current_path text,
  user_agent text
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upsert their own session"
ON public.user_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session"
ON public.user_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own session"
ON public.user_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all sessions"
ON public.user_sessions FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete sessions"
ON public.user_sessions FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- Tabela de atividade
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  event_type text NOT NULL,
  path text,
  action text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activity_user_created ON public.user_activity(user_id, created_at DESC);
CREATE INDEX idx_user_activity_created ON public.user_activity(created_at DESC);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own activity"
ON public.user_activity FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all activity"
ON public.user_activity FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete activity"
ON public.user_activity FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- Função de limpeza
CREATE OR REPLACE FUNCTION public.cleanup_old_user_activity()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.user_activity WHERE created_at < now() - interval '7 days';
  DELETE FROM public.user_sessions WHERE last_seen_at < now() - interval '1 day';
$$;