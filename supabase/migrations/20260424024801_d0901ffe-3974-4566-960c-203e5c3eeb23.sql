INSERT INTO public.profile_screens (profile_id, screen_path, screen_name, can_view, can_edit)
SELECT ap.id, '/faturamento-genius', 'Faturamento Genius', true, false
FROM public.access_profiles ap
WHERE NOT EXISTS (
  SELECT 1 FROM public.profile_screens ps
  WHERE ps.profile_id = ap.id AND ps.screen_path = '/faturamento-genius'
);