INSERT INTO public.profile_screens (profile_id, screen_path, screen_name, can_view, can_edit, can_delete)
VALUES ('1ac1e556-5a9f-44a6-93fb-e8beb407637f', '/contabilidade/dre-padrao', 'Contabilidade — DRE Padrão', true, true, false)
ON CONFLICT (profile_id, screen_path) DO UPDATE SET can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit, screen_name = EXCLUDED.screen_name;