
ALTER TABLE public.bi_meta_faturamento
  ADD COLUMN IF NOT EXISTS origem_meta text NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS origem_atualizada_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_bi_meta_faturamento_origem
  ON public.bi_meta_faturamento (anomes_emissao, unidade_negocio, origem_meta);
