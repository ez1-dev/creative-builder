ALTER TABLE public.bi_faturamento ADD COLUMN IF NOT EXISTS fonte_acao text;
CREATE INDEX IF NOT EXISTS bi_faturamento_fonte_acao_idx ON public.bi_faturamento (fonte_acao);