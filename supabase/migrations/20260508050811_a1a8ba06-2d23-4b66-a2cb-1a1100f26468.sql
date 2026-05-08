DELETE FROM public.dashboard_widgets
WHERE type IN ('mapa-cidades','mapa-destinos','mapa-choropleth-uf');

DELETE FROM public.profile_visuals
WHERE visual_key IN ('passagens.mapa-cidades','passagens.mapa-choropleth-uf','passagens.mapa-destinos');

CREATE OR REPLACE FUNCTION public.upsert_passagens_dashboard_default()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dash_id uuid;
  rec RECORD;
BEGIN
  SELECT id INTO v_dash_id
  FROM public.dashboards
  WHERE module = 'passagens-aereas' AND owner_id IS NULL AND is_default = true
  LIMIT 1;

  IF v_dash_id IS NULL THEN
    INSERT INTO public.dashboards (module, name, is_default, owner_id, position)
    VALUES ('passagens-aereas', 'Padrão', true, NULL, 0)
    RETURNING id INTO v_dash_id;
  END IF;

  DELETE FROM public.dashboard_widgets
  WHERE dashboard_id = v_dash_id
    AND type NOT IN ('kpis-row','charts-row','tabela-registros');

  FOR rec IN
    SELECT * FROM (VALUES
      ('kpis-row'::text,         'KPIs'::text,      0, '{"x":0,"y":0, "w":12,"h":3}'::jsonb),
      ('charts-row'::text,       'Gráficos'::text,  1, '{"x":0,"y":3, "w":12,"h":12}'::jsonb),
      ('tabela-registros'::text, 'Registros'::text, 2, '{"x":0,"y":15,"w":12,"h":10}'::jsonb)
    ) AS t(w_type, w_title, w_pos, w_layout)
  LOOP
    IF EXISTS (SELECT 1 FROM public.dashboard_widgets WHERE dashboard_id = v_dash_id AND type = rec.w_type) THEN
      UPDATE public.dashboard_widgets
      SET title = rec.w_title, position = rec.w_pos, layout = rec.w_layout, updated_at = now()
      WHERE dashboard_id = v_dash_id AND type = rec.w_type;
    ELSE
      INSERT INTO public.dashboard_widgets (dashboard_id, type, title, position, layout)
      VALUES (v_dash_id, rec.w_type, rec.w_title, rec.w_pos, rec.w_layout);
    END IF;
  END LOOP;

  PERFORM public.upsert_passagens_dashboard_default();
  RETURN v_dash_id;
END;
$$;

-- Recursão acima causa loop, removendo a chamada
CREATE OR REPLACE FUNCTION public.upsert_passagens_dashboard_default()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dash_id uuid;
  rec RECORD;
BEGIN
  SELECT id INTO v_dash_id
  FROM public.dashboards
  WHERE module = 'passagens-aereas' AND owner_id IS NULL AND is_default = true
  LIMIT 1;

  IF v_dash_id IS NULL THEN
    INSERT INTO public.dashboards (module, name, is_default, owner_id, position)
    VALUES ('passagens-aereas', 'Padrão', true, NULL, 0)
    RETURNING id INTO v_dash_id;
  END IF;

  DELETE FROM public.dashboard_widgets
  WHERE dashboard_id = v_dash_id
    AND type NOT IN ('kpis-row','charts-row','tabela-registros');

  FOR rec IN
    SELECT * FROM (VALUES
      ('kpis-row'::text,         'KPIs'::text,      0, '{"x":0,"y":0, "w":12,"h":3}'::jsonb),
      ('charts-row'::text,       'Gráficos'::text,  1, '{"x":0,"y":3, "w":12,"h":12}'::jsonb),
      ('tabela-registros'::text, 'Registros'::text, 2, '{"x":0,"y":15,"w":12,"h":10}'::jsonb)
    ) AS t(w_type, w_title, w_pos, w_layout)
  LOOP
    IF EXISTS (SELECT 1 FROM public.dashboard_widgets WHERE dashboard_id = v_dash_id AND type = rec.w_type) THEN
      UPDATE public.dashboard_widgets
      SET title = rec.w_title, position = rec.w_pos, layout = rec.w_layout, updated_at = now()
      WHERE dashboard_id = v_dash_id AND type = rec.w_type;
    ELSE
      INSERT INTO public.dashboard_widgets (dashboard_id, type, title, position, layout)
      VALUES (v_dash_id, rec.w_type, rec.w_title, rec.w_pos, rec.w_layout);
    END IF;
  END LOOP;

  RETURN v_dash_id;
END;
$$;