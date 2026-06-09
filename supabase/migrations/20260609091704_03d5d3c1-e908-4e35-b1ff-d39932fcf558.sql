
-- 1. Remover policies abertas que deixavam qualquer autenticado editar o BI Comercial oficial.
DROP POLICY IF EXISTS "Authenticated manage default bi-comercial dashboard" ON public.dashboards;
DROP POLICY IF EXISTS "Authenticated manage default bi-comercial blocks" ON public.dashboard_blocks;
DROP POLICY IF EXISTS "Authenticated manage default bi-comercial widgets" ON public.dashboard_widgets;

-- "Admins manage default dashboards" + "Users manage own dashboards" já cobrem oficial(admin) e pessoal(dono).
-- O mesmo vale para blocks/widgets via "Admins manage blocks/widgets of default dashboards" + "Users manage blocks/widgets of own dashboards".

-- 2. Endurecer can_edit_dashboard: para bi-comercial, só dono ou admin (em oficial).
CREATE OR REPLACE FUNCTION public.can_edit_dashboard(_dashboard_id uuid, _uid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- bi-comercial oficial: somente admin (já tratado acima).
  RETURN false;
END;
$function$;

-- 3. Fork: copia o oficial para um dashboard pessoal do usuário (idempotente).
CREATE OR REPLACE FUNCTION public.fork_bi_comercial_dashboard()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_personal uuid;
  v_official uuid;
  rec_block RECORD;
  v_new_block uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Já existe pessoal? devolve.
  SELECT id INTO v_personal FROM public.dashboards
  WHERE module = 'bi-comercial' AND owner_id = v_uid
  LIMIT 1;
  IF v_personal IS NOT NULL THEN
    RETURN v_personal;
  END IF;

  -- Garante que existe o oficial.
  SELECT id INTO v_official FROM public.dashboards
  WHERE module = 'bi-comercial' AND owner_id IS NULL AND is_default = true
  LIMIT 1;
  IF v_official IS NULL THEN
    v_official := public.upsert_bi_comercial_dashboard_default();
  END IF;

  -- Cria dashboard pessoal.
  INSERT INTO public.dashboards (module, name, owner_id, is_default, position)
  VALUES ('bi-comercial', 'Minha versão', v_uid, false, 0)
  RETURNING id INTO v_personal;

  -- Copia blocks e mantém mapeamento old->new para os widgets.
  CREATE TEMP TABLE _block_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;

  FOR rec_block IN
    SELECT id, title, ordem, layout, cols, config FROM public.dashboard_blocks
    WHERE dashboard_id = v_official ORDER BY ordem
  LOOP
    INSERT INTO public.dashboard_blocks (dashboard_id, title, ordem, layout, cols, config)
    VALUES (v_personal, rec_block.title, rec_block.ordem, rec_block.layout, rec_block.cols, rec_block.config)
    RETURNING id INTO v_new_block;
    INSERT INTO _block_map(old_id, new_id) VALUES (rec_block.id, v_new_block);
  END LOOP;

  -- Copia widgets, remapeando block_id.
  INSERT INTO public.dashboard_widgets (dashboard_id, block_id, type, title, position, layout, config)
  SELECT v_personal, bm.new_id, w.type, w.title, w.position, w.layout, w.config
  FROM public.dashboard_widgets w
  LEFT JOIN _block_map bm ON bm.old_id = w.block_id
  WHERE w.dashboard_id = v_official;

  RETURN v_personal;
END;
$function$;

-- 4. Reset: remove o pessoal do usuário (cascata nos widgets/blocks via FK).
CREATE OR REPLACE FUNCTION public.reset_bi_comercial_personal_dashboard()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  DELETE FROM public.dashboards
  WHERE module = 'bi-comercial' AND owner_id = v_uid;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fork_bi_comercial_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_bi_comercial_personal_dashboard() TO authenticated;
