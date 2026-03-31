
-- Tabela de perfis de acesso (ex: Admin, Comprador, Engenharia)
CREATE TABLE public.access_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de telas associadas a cada perfil
CREATE TABLE public.profile_screens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  screen_path TEXT NOT NULL,
  screen_name TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(profile_id, screen_path)
);

-- Tabela de atribuição de perfil a usuários (user_login = login do ERP)
CREATE TABLE public.user_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_login TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_login, profile_id)
);

-- RLS
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

-- Políticas: permitir leitura e escrita aberta (app usa auth própria via FastAPI)
CREATE POLICY "Allow all access to access_profiles" ON public.access_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to profile_screens" ON public.profile_screens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_access" ON public.user_access FOR ALL USING (true) WITH CHECK (true);

-- Perfil padrão Admin com todas as telas
INSERT INTO public.access_profiles (name, description) VALUES ('Administrador', 'Acesso total a todos os módulos');
