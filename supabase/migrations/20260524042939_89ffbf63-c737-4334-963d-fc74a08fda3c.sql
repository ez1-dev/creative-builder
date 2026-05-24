
-- ============= bi_ops_fila =============
CREATE TABLE public.bi_ops_fila (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codemp integer NOT NULL,
  unidade_negocio text,
  tipo_recurso text,
  codcre text NOT NULL,
  descre text,
  codori text,
  numorp text NOT NULL,
  situacao text NOT NULL DEFAULT 'A',
  codpro text,
  descricao_produto text,
  codopr text,
  descricao_operacao text,
  quantidade_prevista numeric NOT NULL DEFAULT 0,
  tempo_previsto_min numeric NOT NULL DEFAULT 0,
  prioridade integer NOT NULL DEFAULT 5,
  data_geracao_op date,
  etl_updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bi_ops_fila_codcre_situacao ON public.bi_ops_fila(codcre, situacao);
CREATE INDEX idx_bi_ops_fila_unidade ON public.bi_ops_fila(unidade_negocio);
ALTER TABLE public.bi_ops_fila ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read bi_ops_fila"
  ON public.bi_ops_fila FOR SELECT TO authenticated USING (true);

-- ============= programacao_capacidades =============
CREATE TABLE public.programacao_capacidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codemp integer NOT NULL,
  codcre text NOT NULL,
  descre text,
  minutos_dia integer NOT NULL DEFAULT 480,
  qtde_recursos integer NOT NULL DEFAULT 1,
  eficiencia_perc numeric NOT NULL DEFAULT 100,
  hora_inicio text NOT NULL DEFAULT '08:00',
  considerar_sabado boolean NOT NULL DEFAULT false,
  considerar_domingo boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  obs text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (codemp, codcre)
);
ALTER TABLE public.programacao_capacidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read programacao_capacidades"
  ON public.programacao_capacidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage programacao_capacidades"
  ON public.programacao_capacidades FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_programacao_capacidades_updated
  BEFORE UPDATE ON public.programacao_capacidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= programacao_agenda =============
CREATE TABLE public.programacao_agenda (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_programacao text NOT NULL,
  data_programada date NOT NULL,
  hora_inicio text NOT NULL DEFAULT '08:00',
  hora_fim text NOT NULL DEFAULT '17:00',
  codemp integer NOT NULL,
  unidade_negocio text,
  tipo_recurso text,
  codcre text NOT NULL,
  descre text,
  codori text,
  numorp text NOT NULL,
  codpro text,
  codopr text,
  descricao_operacao text,
  tempo_alocado_min integer NOT NULL DEFAULT 0,
  segmento integer NOT NULL DEFAULT 1,
  status_programacao text NOT NULL DEFAULT 'PROGRAMADO',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_programacao_agenda_data_codcre ON public.programacao_agenda(data_programada, codcre);
CREATE INDEX idx_programacao_agenda_lote ON public.programacao_agenda(lote_programacao);
ALTER TABLE public.programacao_agenda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read programacao_agenda"
  ON public.programacao_agenda FOR SELECT TO authenticated USING (true);
-- INSERT/UPDATE/DELETE apenas via service role (edge function)

-- ============= get_programacao_gargalos =============
CREATE OR REPLACE FUNCTION public.get_programacao_gargalos(
  p_data_ini date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_codemp integer DEFAULT NULL,
  p_codcre text DEFAULT NULL,
  p_unidade_negocio text DEFAULT NULL
)
RETURNS TABLE (
  data date,
  dia_semana text,
  unidade_negocio text,
  codcre text,
  descre text,
  carga_programada_horas numeric,
  capacidade_disponivel_horas numeric,
  ocupacao_perc numeric,
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH agenda_agg AS (
    SELECT
      a.data_programada AS data,
      a.codemp,
      a.codcre,
      MAX(a.descre) AS descre,
      MAX(a.unidade_negocio) AS unidade_negocio,
      SUM(a.tempo_alocado_min)::numeric / 60.0 AS carga_horas
    FROM public.programacao_agenda a
    WHERE (p_data_ini IS NULL OR a.data_programada >= p_data_ini)
      AND (p_data_fim IS NULL OR a.data_programada <= p_data_fim)
      AND (p_codemp IS NULL OR a.codemp = p_codemp)
      AND (p_codcre IS NULL OR a.codcre = p_codcre)
      AND (p_unidade_negocio IS NULL OR a.unidade_negocio = p_unidade_negocio)
    GROUP BY a.data_programada, a.codemp, a.codcre
  )
  SELECT
    ag.data,
    CASE extract(dow from ag.data)::int
      WHEN 0 THEN 'Dom' WHEN 1 THEN 'Seg' WHEN 2 THEN 'Ter'
      WHEN 3 THEN 'Qua' WHEN 4 THEN 'Qui' WHEN 5 THEN 'Sex' WHEN 6 THEN 'Sáb'
    END AS dia_semana,
    COALESCE(ag.unidade_negocio, '') AS unidade_negocio,
    ag.codcre,
    COALESCE(ag.descre, c.descre, '') AS descre,
    ROUND(ag.carga_horas, 2) AS carga_programada_horas,
    COALESCE(ROUND((c.minutos_dia * c.qtde_recursos * c.eficiencia_perc / 100.0) / 60.0, 2), 0) AS capacidade_disponivel_horas,
    CASE
      WHEN c.id IS NULL OR c.minutos_dia = 0 THEN 0
      ELSE ROUND(
        (ag.carga_horas * 60.0)
        / NULLIF(c.minutos_dia * c.qtde_recursos * c.eficiencia_perc / 100.0, 0)
        * 100.0
      , 2)
    END AS ocupacao_perc,
    CASE
      WHEN c.id IS NULL THEN 'SEM_PARAMETRO'
      WHEN ag.carga_horas * 60.0 > (c.minutos_dia * c.qtde_recursos * c.eficiencia_perc / 100.0) THEN 'GARGALO'
      WHEN ag.carga_horas * 60.0 >= (c.minutos_dia * c.qtde_recursos * c.eficiencia_perc / 100.0) * 0.7 THEN 'ATENCAO'
      ELSE 'OK'
    END AS status
  FROM agenda_agg ag
  LEFT JOIN public.programacao_capacidades c
    ON c.codemp = ag.codemp AND c.codcre = ag.codcre AND c.ativo = true
  ORDER BY ag.data, ag.codcre;
$$;
