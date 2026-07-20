
-- Layout global de menus (uma linha singleton)
CREATE TABLE public.menu_layout_global (
  id boolean PRIMARY KEY DEFAULT true,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT menu_layout_global_singleton CHECK (id = true)
);

GRANT SELECT ON public.menu_layout_global TO authenticated;
GRANT ALL ON public.menu_layout_global TO service_role;

ALTER TABLE public.menu_layout_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados podem ler layout global"
  ON public.menu_layout_global FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins podem inserir layout global"
  ON public.menu_layout_global FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar layout global"
  ON public.menu_layout_global FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem apagar layout global"
  ON public.menu_layout_global FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_menu_layout_global_updated_at
  BEFORE UPDATE ON public.menu_layout_global
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Layout pessoal por usuário
CREATE TABLE public.menu_layout_user (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_layout_user TO authenticated;
GRANT ALL ON public.menu_layout_user TO service_role;

ALTER TABLE public.menu_layout_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia o próprio layout"
  ON public.menu_layout_user FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_menu_layout_user_updated_at
  BEFORE UPDATE ON public.menu_layout_user
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
