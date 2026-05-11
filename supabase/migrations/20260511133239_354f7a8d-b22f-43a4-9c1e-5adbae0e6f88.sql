-- 1) RLS extras em dashboards/dashboard_widgets para editores de Frota
CREATE POLICY "Frota editors manage default frota dashboard"
ON public.dashboards
FOR ALL
TO authenticated
USING (module = 'frota' AND owner_id IS NULL AND public.can_edit_frota(auth.uid()))
WITH CHECK (module = 'frota' AND owner_id IS NULL AND public.can_edit_frota(auth.uid()));

CREATE POLICY "Frota editors manage default frota widgets"
ON public.dashboard_widgets
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_widgets.dashboard_id
    AND d.module = 'frota'
    AND d.owner_id IS NULL
    AND public.can_edit_frota(auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_widgets.dashboard_id
    AND d.module = 'frota'
    AND d.owner_id IS NULL
    AND public.can_edit_frota(auth.uid())
));

-- 2) upsert_frota_dashboard_default — registra os widgets canônicos
CREATE OR REPLACE FUNCTION public.upsert_frota_dashboard_default()
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
  WHERE module = 'frota' AND owner_id IS NULL AND is_default = true
  LIMIT 1;

  IF v_dash_id IS NULL THEN
    INSERT INTO public.dashboards (module, name, is_default, owner_id, position)
    VALUES ('frota', 'Padrão', true, NULL, 0)
    RETURNING id INTO v_dash_id;
  END IF;

  -- Apaga widgets fora da lista canônica (preserva custom-*)
  DELETE FROM public.dashboard_widgets
  WHERE dashboard_id = v_dash_id
    AND type NOT LIKE 'custom-%'
    AND type NOT IN (
      'kpis-row',
      'chart-evolucao-mensal',
      'chart-segmento',
      'chart-top-veiculos',
      'chart-top-fornecedores',
      'chart-top-cc',
      'chart-top-motoristas',
      'tabela-registros'
    );

  FOR rec IN
    SELECT * FROM (VALUES
      ('kpis-row'::text,                'KPIs'::text,                  0, '{"x":0,"y":0,  "w":12,"h":3}'::jsonb),
      ('chart-evolucao-mensal'::text,   'Evolução Mensal'::text,       1, '{"x":0,"y":3,  "w":6, "h":8}'::jsonb),
      ('chart-segmento'::text,          'Por Segmento'::text,          2, '{"x":6,"y":3,  "w":6, "h":8}'::jsonb),
      ('chart-top-veiculos'::text,      'Top Veículos'::text,          3, '{"x":0,"y":11, "w":6, "h":8}'::jsonb),
      ('chart-top-fornecedores'::text,  'Top Fornecedores'::text,      4, '{"x":6,"y":11, "w":6, "h":8}'::jsonb),
      ('chart-top-cc'::text,            'Top Centros de Custo'::text,  5, '{"x":0,"y":19, "w":6, "h":8}'::jsonb),
      ('chart-top-motoristas'::text,    'Top Motoristas'::text,        6, '{"x":6,"y":19, "w":6, "h":8}'::jsonb),
      ('tabela-registros'::text,        'Registros'::text,             7, '{"x":0,"y":27, "w":12,"h":10}'::jsonb)
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

-- 3) get_frota_layout_via_token — leitura pública para link compartilhado
CREATE OR REPLACE FUNCTION public.get_frota_layout_via_token(_token text)
RETURNS TABLE(widget_id uuid, widget_type text, widget_title text, widget_position integer, widget_layout jsonb, widget_config jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.validate_frota_share_token(_token, NULL) THEN
    RAISE EXCEPTION 'Token inválido ou expirado';
  END IF;

  RETURN QUERY
  SELECT w.id, w.type, w.title, w.position, w.layout, w.config
  FROM public.dashboard_widgets w
  JOIN public.dashboards d ON d.id = w.dashboard_id
  WHERE d.module = 'frota'
    AND d.owner_id IS NULL
    AND d.is_default = true
  ORDER BY w.position;
END;
$function$;