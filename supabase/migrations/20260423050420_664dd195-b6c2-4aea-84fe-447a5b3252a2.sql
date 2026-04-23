-- Tabela: histórico de buscas do usuário (memória curta, 30 dias)
CREATE TABLE public.user_search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ush_user_module_created ON public.user_search_history (user_id, module, created_at DESC);
CREATE INDEX idx_ush_created_at ON public.user_search_history (created_at);

ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own search history"
  ON public.user_search_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON public.user_search_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history"
  ON public.user_search_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all search history"
  ON public.user_search_history FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Tabela: preferências aprendidas (memória longa)
CREATE TABLE public.user_preferences (
  user_id UUID NOT NULL PRIMARY KEY,
  favorite_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  frequent_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferred_period TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages preferences"
  ON public.user_preferences FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read all preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Função de limpeza
CREATE OR REPLACE FUNCTION public.cleanup_old_search_history()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.user_search_history
  WHERE created_at < now() - interval '30 days';
$$;