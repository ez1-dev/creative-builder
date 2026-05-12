
ALTER TABLE public.manutencao_frota ADD COLUMN IF NOT EXISTS tipo_veiculo text;

CREATE OR REPLACE FUNCTION public.normalize_frota_upper()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.placa IS NOT NULL THEN NEW.placa := upper(trim(NEW.placa)); END IF;
  IF NEW.veiculo_descricao IS NOT NULL THEN NEW.veiculo_descricao := upper(trim(NEW.veiculo_descricao)); END IF;
  IF NEW.motorista IS NOT NULL THEN NEW.motorista := upper(trim(NEW.motorista)); END IF;
  IF NEW.centro_custo IS NOT NULL THEN NEW.centro_custo := upper(trim(NEW.centro_custo)); END IF;
  IF NEW.segmento IS NOT NULL THEN NEW.segmento := upper(trim(NEW.segmento)); END IF;
  IF NEW.tipo_veiculo IS NOT NULL THEN NEW.tipo_veiculo := upper(trim(NEW.tipo_veiculo)); END IF;
  IF NEW.fornecedor IS NOT NULL THEN NEW.fornecedor := trim(NEW.fornecedor); END IF;
  IF NEW.mes IS NULL OR NEW.mes = '' THEN
    NEW.mes := CASE extract(month from NEW.data)::int
      WHEN 1 THEN 'jan' WHEN 2 THEN 'fev' WHEN 3 THEN 'mar' WHEN 4 THEN 'abr'
      WHEN 5 THEN 'mai' WHEN 6 THEN 'jun' WHEN 7 THEN 'jul' WHEN 8 THEN 'ago'
      WHEN 9 THEN 'set' WHEN 10 THEN 'out' WHEN 11 THEN 'nov' WHEN 12 THEN 'dez'
    END;
  END IF;
  RETURN NEW;
END; $function$;

UPDATE public.manutencao_frota
SET tipo_veiculo = CASE
  WHEN veiculo_descricao IS NULL THEN 'OUTRO'
  WHEN upper(veiculo_descricao) ~ 'GUINDASTE' THEN 'GUINDASTE'
  WHEN upper(veiculo_descricao) ~ 'MUCK' THEN 'MUCK'
  WHEN upper(veiculo_descricao) ~ 'CA[ÇC]AMBA' THEN 'CAÇAMBA'
  WHEN upper(veiculo_descricao) ~ 'CARRETA' THEN 'CARRETA'
  WHEN upper(veiculo_descricao) ~ '(CAMINH[ÃA]O|ATEGO|STRALIS|S-WAY|SWAY|L220|MERCEDEZ|MERCEDES|IVECO|VOLVO)' THEN 'CAMINHÃO'
  WHEN upper(veiculo_descricao) ~ '(STRADA|GOL|SW4|VOLCANO|FREEDOM|FIAT|VW)' THEN 'LEVE'
  ELSE 'OUTRO'
END
WHERE tipo_veiculo IS NULL;
