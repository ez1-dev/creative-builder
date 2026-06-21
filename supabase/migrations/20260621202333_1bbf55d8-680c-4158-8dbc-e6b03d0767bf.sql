DROP TRIGGER IF EXISTS etl_agendamentos_set_updated_at ON public.etl_agendamentos;

CREATE OR REPLACE FUNCTION public.etl_agendamentos_before_save()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.nome_tarefa IS NULL OR NEW.nome_tarefa = '' THEN
    SELECT nome_tarefa INTO NEW.nome_tarefa FROM public.etl_tarefas WHERE id = NEW.tarefa_id;
  END IF;
  IF NEW.ativo AND NEW.proxima_execucao_em IS NULL THEN
    NEW.proxima_execucao_em := public.etl_agendamento_calcular_proxima(
      NEW.frequencia, NEW.intervalo_minutos, NEW.hora, NEW.minuto, NEW.dias_semana, now()
    );
  END IF;
  IF NOT NEW.ativo THEN
    NEW.proxima_execucao_em := NULL;
  END IF;
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$function$;