-- Substitui a função pelo novo seed (4 blocos)
CREATE OR REPLACE FUNCTION public.upsert_passagens_dashboard_default()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dash_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT id INTO v_dash_id
  FROM public.dashboards
  WHERE module = 'passagens-aereas' AND owner_id IS NULL AND is_default = true
  LIMIT 1;

  IF v_dash_id IS NULL THEN
    INSERT INTO public.dashboards (name, module, is_default, owner_id, position)
    VALUES ('Passagens Aéreas — Padrão', 'passagens-aereas', true, NULL, 0)
    RETURNING id INTO v_dash_id;
  END IF;

  -- Limpa widgets antigos (8 blocos) para deixar a nova estrutura
  DELETE FROM public.dashboard_widgets
  WHERE dashboard_id = v_dash_id
    AND type NOT IN ('kpis-row','mapa-destinos','charts-row','tabela-registros');

  INSERT INTO public.dashboard_widgets (dashboard_id, type, title, position, layout, config)
  SELECT v_dash_id, t.type, t.title, t.pos, t.layout::jsonb, '{}'::jsonb
  FROM (VALUES
    ('kpis-row',         'KPIs',                 0, '{"x":0,"y":0,"w":12,"h":3}'),
    ('mapa-destinos',    'Mapa de Destinos',     1, '{"x":0,"y":3,"w":12,"h":7}'),
    ('charts-row',       'Gráficos',             2, '{"x":0,"y":10,"w":12,"h":12}'),
    ('tabela-registros', 'Registros',            3, '{"x":0,"y":22,"w":12,"h":10}')
  ) AS t(type, title, pos, layout)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.dashboard_widgets w
    WHERE w.dashboard_id = v_dash_id AND w.type = t.type
  );

  RETURN v_dash_id;
END;
$$;