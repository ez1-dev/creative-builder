ALTER TYPE public.navegacao_acao ADD VALUE IF NOT EXISTS 'ABRIU_TELA';
ALTER TYPE public.navegacao_acao ADD VALUE IF NOT EXISTS 'HEARTBEAT';
ALTER TYPE public.navegacao_acao ADD VALUE IF NOT EXISTS 'TROCOU_TELA';
ALTER TYPE public.navegacao_acao ADD VALUE IF NOT EXISTS 'FECHOU_TELA';

ALTER TABLE public.usu_log_navegacao_erp
  ADD COLUMN IF NOT EXISTS path_url      text,
  ADD COLUMN IF NOT EXISTS observacao    text,
  ADD COLUMN IF NOT EXISTS origem_evento text NOT NULL DEFAULT 'ERP_WEB';