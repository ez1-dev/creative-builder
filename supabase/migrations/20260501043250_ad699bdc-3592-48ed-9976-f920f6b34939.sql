CREATE TABLE public.senior_disconnect_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key        text NOT NULL UNIQUE,
  nome            text NOT NULL,
  descricao       text,
  enabled         boolean NOT NULL DEFAULT false,
  params          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.senior_disconnect_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read senior_disconnect_rules"
  ON public.senior_disconnect_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage senior_disconnect_rules"
  ON public.senior_disconnect_rules FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_senior_disconnect_rules_updated
  BEFORE UPDATE ON public.senior_disconnect_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.senior_disconnect_whitelist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario      text NOT NULL,
  motivo       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid
);
CREATE UNIQUE INDEX ux_senior_wl_usuario ON public.senior_disconnect_whitelist (upper(usuario));
ALTER TABLE public.senior_disconnect_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read senior_disconnect_whitelist"
  ON public.senior_disconnect_whitelist FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage senior_disconnect_whitelist"
  ON public.senior_disconnect_whitelist FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));