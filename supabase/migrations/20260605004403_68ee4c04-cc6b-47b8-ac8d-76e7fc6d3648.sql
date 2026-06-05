-- RPCs para CRUD de blocos com permissões por módulo

CREATE OR REPLACE FUNCTION public.can_edit_dashboard(_dashboard_id uuid, _uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE d RECORD;
BEGIN
  SELECT module, owner_id INTO d FROM public.dashboards WHERE id = _dashboard_id;
  IF d IS NULL THEN RETURN false; END IF;
  IF d.owner_id = _uid THEN RETURN true; END IF;
  IF d.owner_id IS NOT NULL THEN RETURN false; END IF;
  IF public.is_admin(_uid) THEN RETURN true; END IF;
  IF d.module = 'passagens-aereas' THEN RETURN public.can_edit_passagens(_uid); END IF;
  IF d.module = 'frota' THEN RETURN public.can_edit_frota(_uid); END IF;
  IF d.module = 'manutencao-maquinas' THEN RETURN public.can_edit_maquinas(_uid); END IF;
  IF d.module = 'bi-comercial' THEN RETURN true; END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_dashboard_block(_dashboard_id uuid, _title text DEFAULT 'Novo Bloco'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid; v_ordem int;
BEGIN
  IF NOT public.can_edit_dashboard(_dashboard_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para editar este dashboard';
  END IF;
  SELECT COALESCE(MAX(ordem), -1) + 1 INTO v_ordem FROM public.dashboard_blocks WHERE dashboard_id = _dashboard_id;
  INSERT INTO public.dashboard_blocks (dashboard_id, title, ordem)
  VALUES (_dashboard_id, COALESCE(NULLIF(trim(_title), ''), 'Novo Bloco'), v_ordem)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_dashboard_block(_block_id uuid, _title text DEFAULT NULL::text, _ordem integer DEFAULT NULL::integer, _cols smallint DEFAULT NULL::smallint, _config jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_dash uuid;
BEGIN
  SELECT dashboard_id INTO v_dash FROM public.dashboard_blocks WHERE id = _block_id;
  IF v_dash IS NULL THEN RAISE EXCEPTION 'Bloco não encontrado'; END IF;
  IF NOT public.can_edit_dashboard(v_dash, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para editar este dashboard';
  END IF;
  UPDATE public.dashboard_blocks SET
    title = COALESCE(NULLIF(trim(_title), ''), title),
    ordem = COALESCE(_ordem, ordem),
    cols = COALESCE(_cols, cols),
    config = COALESCE(_config, config),
    updated_at = now()
  WHERE id = _block_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_dashboard_block(_block_id uuid, _move_widgets_to uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_dash uuid; v_target uuid; v_count int;
BEGIN
  SELECT dashboard_id INTO v_dash FROM public.dashboard_blocks WHERE id = _block_id;
  IF v_dash IS NULL THEN RAISE EXCEPTION 'Bloco não encontrado'; END IF;
  IF NOT public.can_edit_dashboard(v_dash, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para editar este dashboard';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.dashboard_widgets WHERE block_id = _block_id;
  IF v_count > 0 THEN
    IF _move_widgets_to IS NOT NULL THEN
      v_target := _move_widgets_to;
      IF NOT EXISTS (SELECT 1 FROM public.dashboard_blocks WHERE id = v_target AND dashboard_id = v_dash) THEN
        RAISE EXCEPTION 'Bloco destino inválido';
      END IF;
    ELSE
      SELECT id INTO v_target FROM public.dashboard_blocks
      WHERE dashboard_id = v_dash AND id <> _block_id
      ORDER BY ordem, created_at LIMIT 1;
      IF v_target IS NULL THEN
        -- Não pode excluir o último bloco com widgets sem destino
        RAISE EXCEPTION 'Não é possível excluir o único bloco que contém componentes. Crie outro bloco primeiro ou mova os componentes.';
      END IF;
    END IF;
    UPDATE public.dashboard_widgets SET block_id = v_target, updated_at = now() WHERE block_id = _block_id;
  END IF;

  DELETE FROM public.dashboard_blocks WHERE id = _block_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_widget_to_block(_widget_id uuid, _block_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_dash uuid; v_target_dash uuid;
BEGIN
  SELECT dashboard_id INTO v_dash FROM public.dashboard_widgets WHERE id = _widget_id;
  IF v_dash IS NULL THEN RAISE EXCEPTION 'Componente não encontrado'; END IF;
  SELECT dashboard_id INTO v_target_dash FROM public.dashboard_blocks WHERE id = _block_id;
  IF v_target_dash IS NULL THEN RAISE EXCEPTION 'Bloco destino não encontrado'; END IF;
  IF v_dash <> v_target_dash THEN
    RAISE EXCEPTION 'Bloco destino pertence a outro dashboard';
  END IF;
  IF NOT public.can_edit_dashboard(v_dash, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para editar este dashboard';
  END IF;
  UPDATE public.dashboard_widgets
  SET block_id = _block_id, layout = jsonb_set(jsonb_set(layout, '{x}', '0'::jsonb), '{y}', '9999'::jsonb), updated_at = now()
  WHERE id = _widget_id;
END;
$$;