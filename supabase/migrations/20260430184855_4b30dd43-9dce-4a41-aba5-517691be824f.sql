CREATE OR REPLACE FUNCTION public.get_passagens_layout_via_token(_token text)
RETURNS TABLE(
  widget_id uuid,
  widget_type text,
  widget_title text,
  widget_position int,
  widget_layout jsonb,
  widget_config jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.validate_share_token(_token, NULL) THEN
    RAISE EXCEPTION 'Token inválido ou expirado';
  END IF;

  RETURN QUERY
  SELECT w.id, w.type, w.title, w.position, w.layout, w.config
  FROM public.dashboard_widgets w
  JOIN public.dashboards d ON d.id = w.dashboard_id
  WHERE d.module = 'passagens-aereas'
    AND d.owner_id IS NULL
    AND d.is_default = true
  ORDER BY w.position;
END;
$$;

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

  INSERT INTO public.dashboard_widgets (dashboard_id, type, title, position, layout, config)
  SELECT v_dash_id, t.type, t.title, t.pos, t.layout::jsonb, '{}'::jsonb
  FROM (VALUES
    ('kpi-total',         'Total Geral',          0, '{"x":0,"y":0,"w":3,"h":2}'),
    ('kpi-registros',     'Registros',            1, '{"x":3,"y":0,"w":3,"h":2}'),
    ('kpi-colaboradores', 'Colaboradores',        2, '{"x":6,"y":0,"w":3,"h":2}'),
    ('kpi-ticket',        'Ticket Médio',         3, '{"x":9,"y":0,"w":3,"h":2}'),
    ('mapa-destinos',     'Mapa de Destinos',     4, '{"x":0,"y":2,"w":12,"h":6}'),
    ('chart-evolucao',    'Evolução Mensal',      5, '{"x":0,"y":8,"w":6,"h":5}'),
    ('chart-motivo',      'Por Motivo',           6, '{"x":6,"y":8,"w":6,"h":5}'),
    ('chart-cc',          'Top Centros de Custo', 7, '{"x":0,"y":13,"w":12,"h":6}'),
    ('tabela-registros',  'Registros',            8, '{"x":0,"y":19,"w":12,"h":8}')
  ) AS t(type, title, pos, layout)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.dashboard_widgets w
    WHERE w.dashboard_id = v_dash_id AND w.type = t.type
  );

  RETURN v_dash_id;
END;
$$;