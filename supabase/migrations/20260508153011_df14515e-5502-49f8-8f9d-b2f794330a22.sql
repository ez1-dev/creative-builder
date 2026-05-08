CREATE OR REPLACE FUNCTION public.upsert_passagens_dashboard_default()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND type NOT IN (
      'kpis-row',
      'chart-evolucao-mensal',
      'chart-motivo-viagem',
      'chart-top-cc',
      'chart-top-cidades',
      'chart-top-uf',
      'chart-top-destinos-valor',
      'tabela-registros'
    );

  FOR rec IN
    SELECT * FROM (VALUES
      ('kpis-row'::text,                 'KPIs'::text,                    0, '{"x":0,"y":0, "w":12,"h":3}'::jsonb),
      ('chart-evolucao-mensal'::text,    'Evolução Mensal'::text,         1, '{"x":0,"y":3, "w":6, "h":8}'::jsonb),
      ('chart-motivo-viagem'::text,      'Por Motivo de Viagem'::text,    2, '{"x":6,"y":3, "w":6, "h":8}'::jsonb),
      ('chart-top-cc'::text,             'Top Centros de Custo'::text,    3, '{"x":0,"y":11,"w":12,"h":8}'::jsonb),
      ('chart-top-cidades'::text,        'Top Cidades de Destino'::text,  4, '{"x":0,"y":19,"w":6, "h":8}'::jsonb),
      ('chart-top-uf'::text,             'Top Estados (UF)'::text,        5, '{"x":6,"y":19,"w":6, "h":8}'::jsonb),
      ('chart-top-destinos-valor'::text, 'Top Destinos por Valor'::text,  6, '{"x":0,"y":27,"w":6, "h":10}'::jsonb),
      ('tabela-registros'::text,         'Registros'::text,               7, '{"x":0,"y":37,"w":12,"h":10}'::jsonb)
    ) AS t(w_type, w_title, w_pos, w_layout)
  LOOP
    IF EXISTS (SELECT 1 FROM public.dashboard_widgets WHERE dashboard_id = v_dash_id AND type = rec.w_type) THEN
      UPDATE public.dashboard_widgets
      SET title = rec.w_title, position = rec.w_pos, updated_at = now()
      WHERE dashboard_id = v_dash_id AND type = rec.w_type;
    ELSE
      INSERT INTO public.dashboard_widgets (dashboard_id, type, title, position, layout)
      VALUES (v_dash_id, rec.w_type, rec.w_title, rec.w_pos, rec.w_layout);
    END IF;
  END LOOP;

  RETURN v_dash_id;
END;
$function$;

SELECT public.upsert_passagens_dashboard_default();