ALTER TABLE public.passagens_aereas ADD COLUMN IF NOT EXISTS produto TEXT;
CREATE INDEX IF NOT EXISTS idx_passagens_aereas_produto ON public.passagens_aereas(produto);