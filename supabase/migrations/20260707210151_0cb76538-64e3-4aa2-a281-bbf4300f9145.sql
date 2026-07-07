
-- 1) bi_dre_auditoria: usuario_id must match caller
DROP POLICY IF EXISTS "Authenticated insert auditoria" ON public.bi_dre_auditoria;
CREATE POLICY "Auth insert own auditoria"
  ON public.bi_dre_auditoria
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id IS NOT NULL AND usuario_id = auth.uid());

-- 2) bi_dre_classificacoes: require has_bi_access AND criado_por = auth.uid()
DROP POLICY IF EXISTS "auth insert classificacoes" ON public.bi_dre_classificacoes;
CREATE POLICY "authorized insert classificacoes"
  ON public.bi_dre_classificacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    criado_por IS NOT NULL
    AND criado_por = auth.uid()
    AND public.has_bi_access(auth.uid())
  );

-- 3) bi_dre_excecoes: require has_bi_access AND criado_por = auth.uid()
DROP POLICY IF EXISTS "Autenticados criam excecoes DRE" ON public.bi_dre_excecoes;
CREATE POLICY "Autorizados criam excecoes DRE"
  ON public.bi_dre_excecoes
  FOR INSERT TO authenticated
  WITH CHECK (
    criado_por IS NOT NULL
    AND criado_por = auth.uid()
    AND public.has_bi_access(auth.uid())
  );

-- 4) dashboard_cache: revoke direct writes; expose validated SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "Authenticated write dashboard_cache" ON public.dashboard_cache;
DROP POLICY IF EXISTS "Authenticated update dashboard_cache" ON public.dashboard_cache;
DROP POLICY IF EXISTS "Authenticated delete dashboard_cache" ON public.dashboard_cache;
REVOKE INSERT, UPDATE, DELETE ON public.dashboard_cache FROM authenticated;

CREATE OR REPLACE FUNCTION public.set_dashboard_cache(
  _cache_key text,
  _payload jsonb,
  _valid_until timestamptz,
  _filtros_hash text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _cache_key IS NULL OR length(_cache_key) = 0 OR length(_cache_key) > 500 THEN
    RAISE EXCEPTION 'invalid cache_key';
  END IF;
  IF _payload IS NULL THEN
    RAISE EXCEPTION 'payload required';
  END IF;
  IF _valid_until IS NULL OR _valid_until <= now() OR _valid_until > now() + interval '7 days' THEN
    RAISE EXCEPTION 'invalid valid_until';
  END IF;
  INSERT INTO public.dashboard_cache (cache_key, payload, filtros_hash, valid_until)
  VALUES (_cache_key, _payload, _filtros_hash, _valid_until)
  ON CONFLICT (cache_key) DO UPDATE
    SET payload = EXCLUDED.payload,
        filtros_hash = EXCLUDED.filtros_hash,
        valid_until = EXCLUDED.valid_until;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_dashboard_cache_prefix(_prefix text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _prefix IS NULL OR length(_prefix) < 2 OR length(_prefix) > 200 THEN
    RAISE EXCEPTION 'invalid prefix';
  END IF;
  DELETE FROM public.dashboard_cache WHERE cache_key LIKE _prefix || '%';
END;
$$;

REVOKE ALL ON FUNCTION public.set_dashboard_cache(text, jsonb, timestamptz, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_dashboard_cache(text, jsonb, timestamptz, text) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_dashboard_cache_prefix(text) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_dashboard_cache_prefix(text) TO authenticated;

-- 5) error_logs: constrain user_email to caller (or null for pre-auth errors) + basic length checks
DROP POLICY IF EXISTS "Authenticated insert error_logs" ON public.error_logs;
CREATE POLICY "Auth insert own error_logs"
  ON public.error_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_email IS NULL OR lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    AND module IS NOT NULL AND length(module) BETWEEN 1 AND 200
    AND message IS NOT NULL AND length(message) <= 1000
  );
