ALTER TABLE public.passagens_aereas
  ADD COLUMN IF NOT EXISTS uf_destino text;

ALTER TABLE public.passagens_aereas
  DROP CONSTRAINT IF EXISTS passagens_aereas_uf_destino_chk;

ALTER TABLE public.passagens_aereas
  ADD CONSTRAINT passagens_aereas_uf_destino_chk
  CHECK (uf_destino IS NULL OR uf_destino ~ '^[A-Z]{2}$');