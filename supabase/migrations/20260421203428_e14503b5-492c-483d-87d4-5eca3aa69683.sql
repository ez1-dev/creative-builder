INSERT INTO public.profile_screens (profile_id, screen_path, screen_name, can_view, can_edit)
SELECT ap.id, '/sugestao-min-max', 'Sugestão Min/Max', true, false
FROM public.access_profiles ap
ON CONFLICT (profile_id, screen_path) DO UPDATE SET can_view = true;