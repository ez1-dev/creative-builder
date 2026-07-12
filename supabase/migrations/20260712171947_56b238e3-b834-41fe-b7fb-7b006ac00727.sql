
-- 1) Preferências pessoais
ALTER TABLE public.user_demo_preferences
  ADD COLUMN IF NOT EXISTS presentation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS presentation_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Share links: frota, máquinas, passagens
ALTER TABLE public.manutencao_frota_share_links
  ADD COLUMN IF NOT EXISTS presentation_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS presentation_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.manutencao_maquinas_share_links
  ADD COLUMN IF NOT EXISTS presentation_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS presentation_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.passagens_aereas_share_links
  ADD COLUMN IF NOT EXISTS presentation_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS presentation_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3) Funções para o viewer público consultar a flag de apresentação por token
CREATE OR REPLACE FUNCTION public.get_frota_share_link_presentation(_token text)
RETURNS TABLE(presentation_mode boolean, presentation_settings jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(presentation_mode, false), COALESCE(presentation_settings, '{}'::jsonb)
  FROM public.manutencao_frota_share_links
  WHERE token = _token AND active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_maquinas_share_link_presentation(_token text)
RETURNS TABLE(presentation_mode boolean, presentation_settings jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(presentation_mode, false), COALESCE(presentation_settings, '{}'::jsonb)
  FROM public.manutencao_maquinas_share_links
  WHERE token = _token AND active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_passagens_share_link_presentation(_token text)
RETURNS TABLE(presentation_mode boolean, presentation_settings jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(presentation_mode, false), COALESCE(presentation_settings, '{}'::jsonb)
  FROM public.passagens_aereas_share_links
  WHERE token = _token AND active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_frota_share_link_presentation(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_maquinas_share_link_presentation(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_passagens_share_link_presentation(text) TO anon, authenticated;
