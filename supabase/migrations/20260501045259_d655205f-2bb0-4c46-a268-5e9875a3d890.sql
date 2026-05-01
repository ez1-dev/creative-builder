-- Enum de ações de navegação
CREATE TYPE public.navegacao_acao AS ENUM (
  'entrar',
  'sair',
  'click',
  'erro'
);

-- Tabela principal
CREATE TABLE public.usu_log_navegacao_erp (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    text,
  erp_user      text,
  sistema       text NOT NULL DEFAULT 'ERP_WEB',
  tela_codigo   text,
  tela_nome     text,
  acao          public.navegacao_acao NOT NULL DEFAULT 'entrar',
  computador    text,
  ip            text,
  user_agent    text,
  session_id    text,
  detalhes      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.usu_log_navegacao_erp IS
'Log de navegação por tela. ERP Web grava automaticamente. Para ERP Senior nativo, requer customização/API enviando eventos — R911SEC/R911MOD não expõem a tela exata.';

CREATE INDEX idx_usu_log_navegacao_user_created
  ON public.usu_log_navegacao_erp (user_id, created_at DESC);
CREATE INDEX idx_usu_log_navegacao_erp_user_created
  ON public.usu_log_navegacao_erp (erp_user, created_at DESC);
CREATE INDEX idx_usu_log_navegacao_sistema_created
  ON public.usu_log_navegacao_erp (sistema, created_at DESC);

ALTER TABLE public.usu_log_navegacao_erp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own navegacao"
ON public.usu_log_navegacao_erp FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own navegacao"
ON public.usu_log_navegacao_erp FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins read all navegacao"
ON public.usu_log_navegacao_erp FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete navegacao"
ON public.usu_log_navegacao_erp FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- View: última tela por usuário (combina user_id e erp_user)
CREATE OR REPLACE VIEW public.vw_ultima_tela_usuario
WITH (security_invoker = true) AS
SELECT DISTINCT ON (COALESCE(user_id::text, erp_user))
  user_id,
  user_email,
  erp_user,
  sistema,
  tela_codigo,
  tela_nome,
  acao,
  computador,
  ip,
  user_agent,
  session_id,
  created_at AS ultima_navegacao
FROM public.usu_log_navegacao_erp
ORDER BY COALESCE(user_id::text, erp_user), created_at DESC;

-- Função de limpeza (90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_navegacao_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.usu_log_navegacao_erp
  WHERE created_at < now() - interval '90 days';
$$;