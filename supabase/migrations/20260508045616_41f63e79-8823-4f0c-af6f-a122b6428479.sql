CREATE OR REPLACE FUNCTION public.upsert_passagens_dashboard_default()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dash_id uuid;
  r record;
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

  -- Remove widgets antigos fora dos 5 canônicos
  DELETE FROM public.dashboard_widgets
  WHERE dashboard_id = v_dash_id
    AND type NOT IN ('kpis-row','mapa-cidades','mapa-destinos','charts-row','tabela-registros');

  FOR r IN
    SELECT * FROM (VALUES
      ('kpis-row',         'KPIs',                 0, '{"x":0,"y":0, "w":12,"h":3}'::jsonb),
      ('mapa-cidades',     'Mapa de Viagens',      1, '{"x":0,"y":3, "w":12,"h":8}'::jsonb),
      ('mapa-destinos',    'Top Destinos',         2, '{"x":0,"y":11,"w":12,"h":7}'::jsonb),
      ('charts-row',       'Gráficos',             3, '{"x":0,"y":18,"w":12,"h":12}'::jsonb),
      ('tabela-registros', 'Registros',            4, '{"x":0,"y":30,"w":12,"h":10}'::jsonb)
    ) AS t(type, title, pos, layout)
  LOOP
    IF EXISTS (SELECT 1 FROM public.dashboard_widgets w WHERE w.dashboard_id = v_dash_id AND w.type = r.type) THEN
      UPDATE public.dashboard_widgets
        SET title = r.title, position = r.pos, layout = r.layout
        WHERE dashboard_id = v_dash_id AND type = r.type;
    ELSE
      INSERT INTO public.dashboard_widgets (dashboard_id, type, title, position, layout, config)
      VALUES (v_dash_id, r.type, r.title, r.pos, r.layout, '{}'::jsonb);
    END IF;
  END LOOP;

  RETURN v_dash_id;
END;
$function$;