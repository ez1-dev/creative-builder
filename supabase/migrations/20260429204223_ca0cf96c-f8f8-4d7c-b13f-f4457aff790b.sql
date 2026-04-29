CREATE TABLE public.profile_visuals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  visual_key text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, visual_key)
);

CREATE INDEX idx_profile_visuals_profile ON public.profile_visuals(profile_id);

ALTER TABLE public.profile_visuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read profile_visuals"
ON public.profile_visuals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage profile_visuals"
ON public.profile_visuals
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_profile_visuals_updated_at
BEFORE UPDATE ON public.profile_visuals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();