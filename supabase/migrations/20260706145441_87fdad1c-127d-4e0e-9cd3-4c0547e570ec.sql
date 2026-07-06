ALTER TABLE public.manutencao_frota ADD COLUMN IF NOT EXISTS categoria text;
UPDATE public.manutencao_frota SET categoria = 'MANUTENCAO' WHERE categoria IS NULL;
ALTER TABLE public.manutencao_frota ALTER COLUMN categoria SET DEFAULT 'MANUTENCAO', ALTER COLUMN categoria SET NOT NULL;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='manutencao_frota_categoria_chk') THEN ALTER TABLE public.manutencao_frota ADD CONSTRAINT manutencao_frota_categoria_chk CHECK (categoria IN ('MANUTENCAO','COMBUSTIVEL','PEDAGIO')); END IF; END $$;
CREATE INDEX IF NOT EXISTS manutencao_frota_categoria_idx ON public.manutencao_frota(categoria);