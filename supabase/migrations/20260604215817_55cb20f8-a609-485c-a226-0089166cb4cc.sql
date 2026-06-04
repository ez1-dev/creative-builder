ALTER TABLE public.bi_meta_faturamento
  ADD COLUMN IF NOT EXISTS ano integer GENERATED ALWAYS AS (substring(anomes_emissao, 1, 4)::int) STORED,
  ADD COLUMN IF NOT EXISTS mes integer GENERATED ALWAYS AS (substring(anomes_emissao, 5, 2)::int) STORED,
  ADD COLUMN IF NOT EXISTS codigo_unidade text GENERATED ALWAYS AS (
    CASE unidade_negocio
      WHEN 'GENIUS' THEN '503'
      WHEN 'ESTRUTURAL ZORTEA' THEN '502'
      ELSE NULL
    END
  ) STORED,
  ADD COLUMN IF NOT EXISTS descricao_unidade text GENERATED ALWAYS AS (
    CASE unidade_negocio
      WHEN 'GENIUS' THEN 'GENIUS'
      WHEN 'ESTRUTURAL ZORTEA' THEN 'ESTRUTURAL ZORTEA'
      ELSE NULL
    END
  ) STORED;