
-- Tabela: dashboards (abas)
CREATE TABLE public.dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  owner_id uuid NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dashboards_module_owner ON public.dashboards(module, owner_id);
CREATE UNIQUE INDEX uq_dashboards_default ON public.dashboards(module, name) WHERE owner_id IS NULL;
CREATE UNIQUE INDEX uq_dashboards_owner ON public.dashboards(module, owner_id, name) WHERE owner_id IS NOT NULL;

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read default and own dashboards"
ON public.dashboards FOR SELECT TO authenticated
USING (owner_id IS NULL OR owner_id = auth.uid());

CREATE POLICY "Users manage own dashboards"
ON public.dashboards FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins manage default dashboards"
ON public.dashboards FOR ALL TO authenticated
USING (owner_id IS NULL AND is_admin(auth.uid()))
WITH CHECK (owner_id IS NULL AND is_admin(auth.uid()));

CREATE TRIGGER trg_dashboards_updated
BEFORE UPDATE ON public.dashboards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: dashboard_widgets
CREATE TABLE public.dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL DEFAULT '',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_widgets_dashboard ON public.dashboard_widgets(dashboard_id);

ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read widgets of visible dashboards"
ON public.dashboard_widgets FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_id
    AND (d.owner_id IS NULL OR d.owner_id = auth.uid())
));

CREATE POLICY "Users manage widgets of own dashboards"
ON public.dashboard_widgets FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_id AND d.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_id AND d.owner_id = auth.uid()
));

CREATE POLICY "Admins manage widgets of default dashboards"
ON public.dashboard_widgets FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_id AND d.owner_id IS NULL AND is_admin(auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_id AND d.owner_id IS NULL AND is_admin(auth.uid())
));

CREATE TRIGGER trg_widgets_updated
BEFORE UPDATE ON public.dashboard_widgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds: dashboards padrão para passagens-aereas
DO $$
DECLARE
  d_visao uuid;
  d_colab uuid;
BEGIN
  INSERT INTO public.dashboards (module, name, is_default, owner_id, position)
  VALUES ('passagens-aereas', 'Visão Geral', true, NULL, 0)
  RETURNING id INTO d_visao;

  INSERT INTO public.dashboards (module, name, is_default, owner_id, position)
  VALUES ('passagens-aereas', 'Por Colaborador', false, NULL, 1)
  RETURNING id INTO d_colab;

  -- Widgets Visão Geral
  INSERT INTO public.dashboard_widgets (dashboard_id, type, title, config, layout, position) VALUES
  (d_visao, 'kpi', 'Total Geral', '{"metric":"sum","field":"valor","format":"currency"}'::jsonb, '{"x":0,"y":0,"w":3,"h":2}'::jsonb, 0),
  (d_visao, 'kpi', 'Registros', '{"metric":"count","format":"number"}'::jsonb, '{"x":3,"y":0,"w":3,"h":2}'::jsonb, 1),
  (d_visao, 'kpi', 'Colaboradores (catálogo)', '{"metric":"catalog_count","format":"number"}'::jsonb, '{"x":6,"y":0,"w":3,"h":2}'::jsonb, 2),
  (d_visao, 'kpi', 'Ticket Médio', '{"metric":"avg","field":"valor","format":"currency"}'::jsonb, '{"x":9,"y":0,"w":3,"h":2}'::jsonb, 3),
  (d_visao, 'bar', 'Gasto por Centro de Custo', '{"dimension":"centro_custo","metric":"sum","field":"valor","limit":15}'::jsonb, '{"x":0,"y":2,"w":8,"h":4}'::jsonb, 4),
  (d_visao, 'pie', 'Por Tipo de Despesa', '{"dimension":"tipo_despesa","metric":"sum","field":"valor"}'::jsonb, '{"x":8,"y":2,"w":4,"h":4}'::jsonb, 5),
  (d_visao, 'line', 'Evolução Mensal', '{"dimension":"data_registro","granularity":"month","metric":"sum","field":"valor"}'::jsonb, '{"x":0,"y":6,"w":12,"h":4}'::jsonb, 6),
  (d_visao, 'table', 'Registros', '{}'::jsonb, '{"x":0,"y":10,"w":12,"h":6}'::jsonb, 7);

  -- Widgets Por Colaborador
  INSERT INTO public.dashboard_widgets (dashboard_id, type, title, config, layout, position) VALUES
  (d_colab, 'bar', 'Top Colaboradores (gasto)', '{"dimension":"colaborador","metric":"sum","field":"valor","limit":20}'::jsonb, '{"x":0,"y":0,"w":12,"h":5}'::jsonb, 0),
  (d_colab, 'pie', 'Por Cia Aérea', '{"dimension":"cia_aerea","metric":"sum","field":"valor"}'::jsonb, '{"x":0,"y":5,"w":4,"h":4}'::jsonb, 1),
  (d_colab, 'bar', 'Por Origem', '{"dimension":"origem","metric":"sum","field":"valor","limit":10}'::jsonb, '{"x":4,"y":5,"w":4,"h":4}'::jsonb, 2),
  (d_colab, 'bar', 'Por Destino', '{"dimension":"destino","metric":"sum","field":"valor","limit":10}'::jsonb, '{"x":8,"y":5,"w":4,"h":4}'::jsonb, 3),
  (d_colab, 'table', 'Registros', '{}'::jsonb, '{"x":0,"y":9,"w":12,"h":6}'::jsonb, 4);
END $$;
