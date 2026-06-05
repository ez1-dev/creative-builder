-- =====================================================================
-- DASHBOARD BLOCKS: introduz camada "Bloco" entre Dashboard e Widget.
-- Todo dashboard_widget passa a pertencer obrigatoriamente a um bloco.
-- =====================================================================

-- 1) Tabela de blocos
CREATE TABLE IF NOT EXISTS public.dashboard_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Bloco Principal',
  ordem int NOT NULL DEFAULT 0,
  layout jsonb NOT NULL DEFAULT '{"x":0,"y":0,"w":12,"h":1}'::jsonb,
  cols smallint NOT NULL DEFAULT 12,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_blocks_dashboard ON public.dashboard_blocks(dashboard_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_blocks TO authenticated;
GRANT ALL ON public.dashboard_blocks TO service_role;

ALTER TABLE public.dashboard_blocks ENABLE ROW LEVEL SECURITY;

-- Espelha as policies de dashboard_widgets ----------------------------------

CREATE POLICY "Read blocks of visible dashboards"
ON public.dashboard_blocks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id
    AND (d.owner_id IS NULL OR d.owner_id = auth.uid())
));

CREATE POLICY "Users manage blocks of own dashboards"
ON public.dashboard_blocks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id AND d.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id AND d.owner_id = auth.uid()));

CREATE POLICY "Admins manage blocks of default dashboards"
ON public.dashboard_blocks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id AND d.owner_id IS NULL AND public.is_admin(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id AND d.owner_id IS NULL AND public.is_admin(auth.uid())));

CREATE POLICY "Authenticated manage default bi-comercial blocks"
ON public.dashboard_blocks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id AND d.module = 'bi-comercial' AND d.owner_id IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id AND d.module = 'bi-comercial' AND d.owner_id IS NULL));

CREATE POLICY "Frota editors manage default frota blocks"
ON public.dashboard_blocks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id AND d.module = 'frota' AND d.owner_id IS NULL AND public.can_edit_frota(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id AND d.module = 'frota' AND d.owner_id IS NULL AND public.can_edit_frota(auth.uid())));

CREATE POLICY "Passagens editors manage default passagens blocks"
ON public.dashboard_blocks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id AND d.module = 'passagens-aereas' AND d.owner_id IS NULL AND public.can_edit_passagens(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.dashboards d
  WHERE d.id = dashboard_blocks.dashboard_id AND d.module = 'passagens-aereas' AND d.owner_id IS NULL AND public.can_edit_passagens(auth.uid())));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.dashboard_blocks_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_dashboard_blocks_touch ON public.dashboard_blocks;
CREATE TRIGGER trg_dashboard_blocks_touch BEFORE UPDATE ON public.dashboard_blocks
FOR EACH ROW EXECUTE FUNCTION public.dashboard_blocks_touch_updated_at();

-- 2) Adiciona block_id em dashboard_widgets (nullable -> backfill -> NOT NULL)
ALTER TABLE public.dashboard_widgets
  ADD COLUMN IF NOT EXISTS block_id uuid REFERENCES public.dashboard_blocks(id) ON DELETE CASCADE;

-- 3) Backfill: para cada dashboard que tem widgets, cria "Bloco Principal"
--    (se ainda não existir) e vincula widgets órfãos.
INSERT INTO public.dashboard_blocks (dashboard_id, title, ordem, layout)
SELECT DISTINCT w.dashboard_id, 'Bloco Principal', 0, '{"x":0,"y":0,"w":12,"h":1}'::jsonb
FROM public.dashboard_widgets w
WHERE NOT EXISTS (
  SELECT 1 FROM public.dashboard_blocks b WHERE b.dashboard_id = w.dashboard_id
);

UPDATE public.dashboard_widgets w
SET block_id = b.id
FROM public.dashboard_blocks b
WHERE b.dashboard_id = w.dashboard_id
  AND b.ordem = 0
  AND w.block_id IS NULL;

-- 4) Trava NOT NULL + índice
ALTER TABLE public.dashboard_widgets ALTER COLUMN block_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_block ON public.dashboard_widgets(block_id, position);

-- 5) Helper: garante um bloco default para um dashboard
CREATE OR REPLACE FUNCTION public.ensure_default_block(_dashboard_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_block_id uuid;
BEGIN
  SELECT id INTO v_block_id
  FROM public.dashboard_blocks
  WHERE dashboard_id = _dashboard_id
  ORDER BY ordem, created_at
  LIMIT 1;

  IF v_block_id IS NULL THEN
    INSERT INTO public.dashboard_blocks (dashboard_id, title, ordem, layout)
    VALUES (_dashboard_id, 'Bloco Principal', 0, '{"x":0,"y":0,"w":12,"h":1}'::jsonb)
    RETURNING id INTO v_block_id;
  END IF;

  RETURN v_block_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_default_block(uuid) TO authenticated;

-- 6) Reescreve as RPCs upsert_*_dashboard_default para criar bloco e usar block_id
CREATE OR REPLACE FUNCTION public.upsert_passagens_dashboard_default()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_dash_id uuid; v_block_id uuid; rec RECORD;
BEGIN
  SELECT id INTO v_dash_id FROM public.dashboards
  WHERE module = 'passagens-aereas' AND owner_id IS NULL AND is_default = true LIMIT 1;
  IF v_dash_id IS NULL THEN
    INSERT INTO public.dashboards (module, name, is_default, owner_id, position)
    VALUES ('passagens-aereas', 'Padrão', true, NULL, 0) RETURNING id INTO v_dash_id;
  END IF;
  v_block_id := public.ensure_default_block(v_dash_id);

  DELETE FROM public.dashboard_widgets
  WHERE dashboard_id = v_dash_id AND type NOT LIKE 'custom-%'
    AND type NOT IN ('kpis-row','chart-evolucao-mensal','chart-motivo-viagem','chart-top-cc','chart-top-cidades','chart-top-uf','chart-top-destinos-valor','tabela-registros');

  FOR rec IN SELECT * FROM (VALUES
    ('kpis-row'::text,                 'KPIs'::text,                    0, '{"x":0,"y":0, "w":12,"h":3}'::jsonb),
    ('chart-evolucao-mensal'::text,    'Evolução Mensal'::text,         1, '{"x":0,"y":3, "w":6, "h":8}'::jsonb),
    ('chart-motivo-viagem'::text,      'Por Motivo de Viagem'::text,    2, '{"x":6,"y":3, "w":6, "h":8}'::jsonb),
    ('chart-top-cc'::text,             'Top Centros de Custo'::text,    3, '{"x":0,"y":11,"w":12,"h":8}'::jsonb),
    ('chart-top-cidades'::text,        'Top Cidades de Destino'::text,  4, '{"x":0,"y":19,"w":6, "h":8}'::jsonb),
    ('chart-top-uf'::text,             'Top Estados (UF)'::text,        5, '{"x":6,"y":19,"w":6, "h":8}'::jsonb),
    ('chart-top-destinos-valor'::text, 'Top Destinos por Valor'::text,  6, '{"x":0,"y":27,"w":6, "h":10}'::jsonb),
    ('tabela-registros'::text,         'Registros'::text,               7, '{"x":0,"y":37,"w":12,"h":10}'::jsonb)
  ) AS t(w_type, w_title, w_pos, w_layout) LOOP
    IF EXISTS (SELECT 1 FROM public.dashboard_widgets WHERE dashboard_id = v_dash_id AND type = rec.w_type) THEN
      UPDATE public.dashboard_widgets SET title = rec.w_title, position = rec.w_pos, block_id = COALESCE(block_id, v_block_id), updated_at = now()
      WHERE dashboard_id = v_dash_id AND type = rec.w_type;
    ELSE
      INSERT INTO public.dashboard_widgets (dashboard_id, block_id, type, title, position, layout)
      VALUES (v_dash_id, v_block_id, rec.w_type, rec.w_title, rec.w_pos, rec.w_layout);
    END IF;
  END LOOP;
  RETURN v_dash_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_frota_dashboard_default()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_dash_id uuid; v_block_id uuid; rec RECORD;
BEGIN
  SELECT id INTO v_dash_id FROM public.dashboards
  WHERE module = 'frota' AND owner_id IS NULL AND is_default = true LIMIT 1;
  IF v_dash_id IS NULL THEN
    INSERT INTO public.dashboards (module, name, is_default, owner_id, position)
    VALUES ('frota', 'Padrão', true, NULL, 0) RETURNING id INTO v_dash_id;
  END IF;
  v_block_id := public.ensure_default_block(v_dash_id);

  DELETE FROM public.dashboard_widgets
  WHERE dashboard_id = v_dash_id AND type NOT LIKE 'custom-%'
    AND type NOT IN ('kpis-row','chart-evolucao-mensal','chart-segmento','chart-top-veiculos','chart-top-fornecedores','chart-top-cc','chart-top-motoristas','chart-tipo-veiculo','tabela-registros');

  FOR rec IN SELECT * FROM (VALUES
    ('kpis-row'::text,                'KPIs'::text,                  0, '{"x":0,"y":0, "w":12,"h":3}'::jsonb),
    ('chart-evolucao-mensal'::text,   'Evolução Mensal'::text,       1, '{"x":0,"y":3, "w":6, "h":8}'::jsonb),
    ('chart-segmento'::text,          'Por Segmento'::text,          2, '{"x":6,"y":3, "w":6, "h":8}'::jsonb),
    ('chart-top-veiculos'::text,      'Top Veículos'::text,          3, '{"x":0,"y":11,"w":6, "h":8}'::jsonb),
    ('chart-top-fornecedores'::text,  'Top Fornecedores'::text,      4, '{"x":6,"y":11,"w":6, "h":8}'::jsonb),
    ('chart-top-cc'::text,            'Top Centros de Custo'::text,  5, '{"x":0,"y":19,"w":6, "h":8}'::jsonb),
    ('chart-top-motoristas'::text,    'Top Motoristas'::text,        6, '{"x":6,"y":19,"w":6, "h":8}'::jsonb),
    ('chart-tipo-veiculo'::text,      'Por Tipo de Veículo'::text,   7, '{"x":0,"y":27,"w":12,"h":8}'::jsonb),
    ('tabela-registros'::text,        'Registros'::text,             8, '{"x":0,"y":35,"w":12,"h":10}'::jsonb)
  ) AS t(w_type, w_title, w_pos, w_layout) LOOP
    IF EXISTS (SELECT 1 FROM public.dashboard_widgets WHERE dashboard_id = v_dash_id AND type = rec.w_type) THEN
      UPDATE public.dashboard_widgets SET title = rec.w_title, position = rec.w_pos, block_id = COALESCE(block_id, v_block_id), updated_at = now()
      WHERE dashboard_id = v_dash_id AND type = rec.w_type;
    ELSE
      INSERT INTO public.dashboard_widgets (dashboard_id, block_id, type, title, position, layout)
      VALUES (v_dash_id, v_block_id, rec.w_type, rec.w_title, rec.w_pos, rec.w_layout);
    END IF;
  END LOOP;
  RETURN v_dash_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_maquinas_dashboard_default()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_dash_id uuid; v_block_id uuid; rec RECORD;
BEGIN
  SELECT id INTO v_dash_id FROM public.dashboards
  WHERE module = 'manutencao-maquinas' AND owner_id IS NULL AND is_default = true LIMIT 1;
  IF v_dash_id IS NULL THEN
    INSERT INTO public.dashboards (module, name, is_default, owner_id, position)
    VALUES ('manutencao-maquinas', 'Padrão', true, NULL, 0) RETURNING id INTO v_dash_id;
  END IF;
  v_block_id := public.ensure_default_block(v_dash_id);

  DELETE FROM public.dashboard_widgets
  WHERE dashboard_id = v_dash_id AND type NOT LIKE 'custom-%'
    AND type NOT IN ('kpis-row','chart-evolucao-mensal','chart-tipo-maquina','chart-top-maquinas','chart-top-fornecedores','chart-top-cc','chart-top-descricoes','tabela-registros');

  FOR rec IN SELECT * FROM (VALUES
    ('kpis-row'::text,                'KPIs'::text,                  0, '{"x":0,"y":0, "w":12,"h":3}'::jsonb),
    ('chart-evolucao-mensal'::text,   'Evolução Mensal'::text,       1, '{"x":0,"y":3, "w":6, "h":8}'::jsonb),
    ('chart-tipo-maquina'::text,      'Por Tipo de Máquina'::text,   2, '{"x":6,"y":3, "w":6, "h":8}'::jsonb),
    ('chart-top-maquinas'::text,      'Top Máquinas'::text,          3, '{"x":0,"y":11,"w":6, "h":8}'::jsonb),
    ('chart-top-fornecedores'::text,  'Top Fornecedores'::text,      4, '{"x":6,"y":11,"w":6, "h":8}'::jsonb),
    ('chart-top-cc'::text,            'Top Centros de Custo'::text,  5, '{"x":0,"y":19,"w":6, "h":8}'::jsonb),
    ('chart-top-descricoes'::text,    'Top Descrições'::text,        6, '{"x":6,"y":19,"w":6, "h":8}'::jsonb),
    ('tabela-registros'::text,        'Registros'::text,             7, '{"x":0,"y":27,"w":12,"h":10}'::jsonb)
  ) AS t(w_type, w_title, w_pos, w_layout) LOOP
    IF EXISTS (SELECT 1 FROM public.dashboard_widgets WHERE dashboard_id = v_dash_id AND type = rec.w_type) THEN
      UPDATE public.dashboard_widgets SET title = rec.w_title, position = rec.w_pos, block_id = COALESCE(block_id, v_block_id), updated_at = now()
      WHERE dashboard_id = v_dash_id AND type = rec.w_type;
    ELSE
      INSERT INTO public.dashboard_widgets (dashboard_id, block_id, type, title, position, layout)
      VALUES (v_dash_id, v_block_id, rec.w_type, rec.w_title, rec.w_pos, rec.w_layout);
    END IF;
  END LOOP;
  RETURN v_dash_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_bi_comercial_dashboard_default()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_block_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.dashboards
  WHERE module = 'bi-comercial' AND owner_id IS NULL AND is_default = true LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.dashboards (module, name, owner_id, is_default, position)
    VALUES ('bi-comercial', 'BI Comercial', NULL, true, 0) RETURNING id INTO v_id;
  END IF;
  v_block_id := public.ensure_default_block(v_id);

  IF NOT EXISTS (SELECT 1 FROM public.dashboard_widgets WHERE dashboard_id = v_id) THEN
    INSERT INTO public.dashboard_widgets (dashboard_id, block_id, type, title, position, layout, config) VALUES
      (v_id, v_block_id, 'kpi-faturamento', 'Faturamento',     0, '{"x":0,"y":0,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, v_block_id, 'kpi-liquido',     'Líquido',         1, '{"x":3,"y":0,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, v_block_id, 'kpi-impostos',    'Impostos',        2, '{"x":6,"y":0,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, v_block_id, 'kpi-devolucao',   'Devolução',       3, '{"x":9,"y":0,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, v_block_id, 'kpi-vendas',      'Nº Vendas',       4, '{"x":0,"y":3,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, v_block_id, 'kpi-clientes',    'Nº Clientes',     5, '{"x":3,"y":3,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, v_block_id, 'kpi-estados',     'Nº Estados',      6, '{"x":6,"y":3,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, v_block_id, 'kpi-ticket',      'Ticket Médio',    7, '{"x":9,"y":3,"w":3,"h":3}'::jsonb, '{"variant":"number"}'::jsonb),
      (v_id, v_block_id, 'serie-mensal',    'Faturamento mensal x Meta', 8,  '{"x":0,"y":6,"w":8,"h":8}'::jsonb,  '{"variant":"combo"}'::jsonb),
      (v_id, v_block_id, 'mix',             'Mix acumulado',             9,  '{"x":8,"y":6,"w":4,"h":8}'::jsonb,  '{"variant":"donut"}'::jsonb),
      (v_id, v_block_id, 'estados',         'Top estados',               10, '{"x":0,"y":14,"w":6,"h":8}'::jsonb, '{"variant":"map"}'::jsonb),
      (v_id, v_block_id, 'revendas',        'Ranking de revendas',       11, '{"x":6,"y":14,"w":6,"h":8}'::jsonb, '{"variant":"ranking"}'::jsonb),
      (v_id, v_block_id, 'obras',           'Faturamento por obra',      12, '{"x":0,"y":22,"w":12,"h":8}'::jsonb,'{"variant":"treemap"}'::jsonb),
      (v_id, v_block_id, 'table-mensal',    'Tabela mensal',             13, '{"x":0,"y":30,"w":12,"h":10}'::jsonb,'{}'::jsonb);
  END IF;
  RETURN v_id;
END;
$$;

-- 7) Atualiza RPCs de link público para incluir block_id e blocos
DROP FUNCTION IF EXISTS public.get_passagens_layout_via_token(text);
CREATE OR REPLACE FUNCTION public.get_passagens_layout_via_token(_token text)
RETURNS TABLE(widget_id uuid, widget_type text, widget_title text, widget_position int, widget_layout jsonb, widget_config jsonb, widget_block_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.validate_share_token(_token, NULL) THEN RAISE EXCEPTION 'Token inválido ou expirado'; END IF;
  RETURN QUERY
  SELECT w.id, w.type, w.title, w.position, w.layout, w.config, w.block_id
  FROM public.dashboard_widgets w
  JOIN public.dashboards d ON d.id = w.dashboard_id
  WHERE d.module = 'passagens-aereas' AND d.owner_id IS NULL AND d.is_default = true
  ORDER BY w.position;
END;
$$;

DROP FUNCTION IF EXISTS public.get_frota_layout_via_token(text);
CREATE OR REPLACE FUNCTION public.get_frota_layout_via_token(_token text)
RETURNS TABLE(widget_id uuid, widget_type text, widget_title text, widget_position int, widget_layout jsonb, widget_config jsonb, widget_block_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.validate_frota_share_token(_token, NULL) THEN RAISE EXCEPTION 'Token inválido ou expirado'; END IF;
  RETURN QUERY
  SELECT w.id, w.type, w.title, w.position, w.layout, w.config, w.block_id
  FROM public.dashboard_widgets w
  JOIN public.dashboards d ON d.id = w.dashboard_id
  WHERE d.module = 'frota' AND d.owner_id IS NULL AND d.is_default = true
  ORDER BY w.position;
END;
$$;

DROP FUNCTION IF EXISTS public.get_maquinas_layout_via_token(text);
CREATE OR REPLACE FUNCTION public.get_maquinas_layout_via_token(_token text)
RETURNS TABLE(widget_id uuid, widget_type text, widget_title text, widget_position int, widget_layout jsonb, widget_config jsonb, widget_block_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.validate_maquinas_share_token(_token, NULL) THEN RAISE EXCEPTION 'Token inválido ou expirado'; END IF;
  RETURN QUERY
  SELECT w.id, w.type, w.title, w.position, w.layout, w.config, w.block_id
  FROM public.dashboard_widgets w
  JOIN public.dashboards d ON d.id = w.dashboard_id
  WHERE d.module = 'manutencao-maquinas' AND d.owner_id IS NULL AND d.is_default = true
  ORDER BY w.position;
END;
$$;

-- 8) RPC para retornar a lista de blocos via token público (passagens)
CREATE OR REPLACE FUNCTION public.get_passagens_blocks_via_token(_token text)
RETURNS TABLE(block_id uuid, title text, ordem int, layout jsonb, cols smallint, config jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.validate_share_token(_token, NULL) THEN RAISE EXCEPTION 'Token inválido ou expirado'; END IF;
  RETURN QUERY
  SELECT b.id, b.title, b.ordem, b.layout, b.cols, b.config
  FROM public.dashboard_blocks b
  JOIN public.dashboards d ON d.id = b.dashboard_id
  WHERE d.module = 'passagens-aereas' AND d.owner_id IS NULL AND d.is_default = true
  ORDER BY b.ordem;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_passagens_blocks_via_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_frota_blocks_via_token(_token text)
RETURNS TABLE(block_id uuid, title text, ordem int, layout jsonb, cols smallint, config jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.validate_frota_share_token(_token, NULL) THEN RAISE EXCEPTION 'Token inválido ou expirado'; END IF;
  RETURN QUERY
  SELECT b.id, b.title, b.ordem, b.layout, b.cols, b.config
  FROM public.dashboard_blocks b
  JOIN public.dashboards d ON d.id = b.dashboard_id
  WHERE d.module = 'frota' AND d.owner_id IS NULL AND d.is_default = true
  ORDER BY b.ordem;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_frota_blocks_via_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_maquinas_blocks_via_token(_token text)
RETURNS TABLE(block_id uuid, title text, ordem int, layout jsonb, cols smallint, config jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.validate_maquinas_share_token(_token, NULL) THEN RAISE EXCEPTION 'Token inválido ou expirado'; END IF;
  RETURN QUERY
  SELECT b.id, b.title, b.ordem, b.layout, b.cols, b.config
  FROM public.dashboard_blocks b
  JOIN public.dashboards d ON d.id = b.dashboard_id
  WHERE d.module = 'manutencao-maquinas' AND d.owner_id IS NULL AND d.is_default = true
  ORDER BY b.ordem;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_maquinas_blocks_via_token(text) TO anon, authenticated;