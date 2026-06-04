
-- 1) Drop legacy bi_user_slot_overrides (substituída pelo modelo dashboards/dashboard_widgets)
DROP TABLE IF EXISTS public.bi_user_slot_overrides CASCADE;

-- 2) RPC: cria/garante o dashboard default do BI Comercial e semeia widgets canônicos
CREATE OR REPLACE FUNCTION public.upsert_bi_comercial_dashboard_default()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.dashboards
  WHERE module = 'bi-comercial' AND owner_id IS NULL AND is_default = true
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.dashboards (module, name, owner_id, is_default, position)
    VALUES ('bi-comercial', 'BI Comercial', NULL, true, 0)
    RETURNING id INTO v_id;
  END IF;

  -- Seed widgets canônicos apenas se ainda não existirem
  IF NOT EXISTS (SELECT 1 FROM public.dashboard_widgets WHERE dashboard_id = v_id) THEN
    INSERT INTO public.dashboard_widgets (dashboard_id, type, title, position, layout, config) VALUES
      (v_id, 'kpi-faturamento', 'Faturamento',     0, '{"x":0,"y":0,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, 'kpi-liquido',     'Líquido',         1, '{"x":3,"y":0,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, 'kpi-impostos',    'Impostos',        2, '{"x":6,"y":0,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, 'kpi-devolucao',   'Devolução',       3, '{"x":9,"y":0,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, 'kpi-vendas',      'Nº Vendas',       4, '{"x":0,"y":3,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, 'kpi-clientes',    'Nº Clientes',     5, '{"x":3,"y":3,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, 'kpi-estados',     'Nº Estados',      6, '{"x":6,"y":3,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, 'kpi-ticket',      'Ticket Médio',    7, '{"x":9,"y":3,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, 'serie-mensal',    'Faturamento mensal x Meta', 8,  '{"x":0,"y":6,"w":8,"h":8}'::jsonb,  '{"variant":"combo"}'::jsonb),
      (v_id, 'mix',             'Mix acumulado',             9,  '{"x":8,"y":6,"w":4,"h":8}'::jsonb,  '{"variant":"donut"}'::jsonb),
      (v_id, 'estados',         'Top estados',               10, '{"x":0,"y":14,"w":6,"h":8}'::jsonb, '{"variant":"map"}'::jsonb),
      (v_id, 'revendas',        'Ranking de revendas',       11, '{"x":6,"y":14,"w":6,"h":8}'::jsonb, '{"variant":"ranking"}'::jsonb),
      (v_id, 'obras',           'Faturamento por obra',      12, '{"x":0,"y":22,"w":12,"h":8}'::jsonb,'{"variant":"treemap"}'::jsonb),
      (v_id, 'table-mensal',    'Tabela mensal',             13, '{"x":0,"y":30,"w":12,"h":10}'::jsonb,'{}'::jsonb);
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_bi_comercial_dashboard_default() TO authenticated;

-- 3) RLS extra: permitir que qualquer usuário autenticado gerencie o dashboard default de bi-comercial
CREATE POLICY "Authenticated manage default bi-comercial dashboard"
ON public.dashboards
FOR ALL TO authenticated
USING (module = 'bi-comercial' AND owner_id IS NULL)
WITH CHECK (module = 'bi-comercial' AND owner_id IS NULL);

CREATE POLICY "Authenticated manage default bi-comercial widgets"
ON public.dashboard_widgets
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_widgets.dashboard_id
    AND d.module = 'bi-comercial'
    AND d.owner_id IS NULL
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_widgets.dashboard_id
    AND d.module = 'bi-comercial'
    AND d.owner_id IS NULL
));

-- 4) Tabela de presets de colunas por escopo de drill (por usuário)
CREATE TABLE public.bi_user_drill_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page_key text NOT NULL,
  escopo text NOT NULL,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key, escopo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_user_drill_presets TO authenticated;
GRANT ALL ON public.bi_user_drill_presets TO service_role;

ALTER TABLE public.bi_user_drill_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own drill presets" ON public.bi_user_drill_presets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own drill presets" ON public.bi_user_drill_presets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own drill presets" ON public.bi_user_drill_presets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own drill presets" ON public.bi_user_drill_presets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_bi_user_drill_presets_updated_at
BEFORE UPDATE ON public.bi_user_drill_presets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
