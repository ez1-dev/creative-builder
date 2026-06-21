
-- Extensões para agendamento
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Tabela de agendamentos
CREATE TABLE public.etl_agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.etl_tarefas(id) ON DELETE CASCADE,
  nome_tarefa text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  frequencia text NOT NULL CHECK (frequencia IN ('intervalo_minutos','diario','semanal')),
  intervalo_minutos integer,
  hora smallint,
  minuto smallint,
  dias_semana smallint[] NOT NULL DEFAULT '{}',
  janela_tipo text NOT NULL DEFAULT 'mes_atual' CHECK (janela_tipo IN ('mes_atual','ultimos_n_meses','mes_anterior')),
  janela_n_meses smallint NOT NULL DEFAULT 1,
  parametros_extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  proxima_execucao_em timestamptz,
  ultima_execucao_em timestamptz,
  ultimo_status text,
  ultima_mensagem text,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_etl_agendamentos_proxima ON public.etl_agendamentos (ativo, proxima_execucao_em);
CREATE INDEX idx_etl_agendamentos_tarefa ON public.etl_agendamentos (tarefa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.etl_agendamentos TO authenticated;
GRANT ALL ON public.etl_agendamentos TO service_role;

ALTER TABLE public.etl_agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam agendamentos ETL"
  ON public.etl_agendamentos FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger para atualizar timestamp
CREATE TRIGGER etl_agendamentos_set_updated_at
  BEFORE UPDATE ON public.etl_agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular próxima execução
CREATE OR REPLACE FUNCTION public.etl_agendamento_calcular_proxima(
  _frequencia text,
  _intervalo_minutos integer,
  _hora smallint,
  _minuto smallint,
  _dias_semana smallint[],
  _ref timestamptz DEFAULT now()
) RETURNS timestamptz
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_local timestamp;
  v_candidato timestamp;
  v_dow smallint;
  i int;
BEGIN
  v_local := (_ref AT TIME ZONE 'America/Sao_Paulo');

  IF _frequencia = 'intervalo_minutos' THEN
    RETURN _ref + make_interval(mins => GREATEST(COALESCE(_intervalo_minutos,5),1));
  END IF;

  IF _frequencia = 'diario' THEN
    v_candidato := date_trunc('day', v_local) + make_interval(hours => COALESCE(_hora,0), mins => COALESCE(_minuto,0));
    IF v_candidato <= v_local THEN
      v_candidato := v_candidato + interval '1 day';
    END IF;
    RETURN v_candidato AT TIME ZONE 'America/Sao_Paulo';
  END IF;

  IF _frequencia = 'semanal' THEN
    IF _dias_semana IS NULL OR array_length(_dias_semana,1) IS NULL THEN
      RETURN NULL;
    END IF;
    FOR i IN 0..7 LOOP
      v_candidato := date_trunc('day', v_local) + (i || ' day')::interval
                   + make_interval(hours => COALESCE(_hora,0), mins => COALESCE(_minuto,0));
      v_dow := EXTRACT(DOW FROM v_candidato)::smallint;
      IF v_dow = ANY(_dias_semana) AND v_candidato > v_local THEN
        RETURN v_candidato AT TIME ZONE 'America/Sao_Paulo';
      END IF;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

-- Trigger para preencher proxima_execucao_em e nome_tarefa
CREATE OR REPLACE FUNCTION public.etl_agendamentos_before_save()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER etl_agendamentos_before_save_trg
  BEFORE INSERT OR UPDATE ON public.etl_agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.etl_agendamentos_before_save();
