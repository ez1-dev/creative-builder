
-- Add approved column to profiles
ALTER TABLE public.profiles ADD COLUMN approved boolean NOT NULL DEFAULT false;

-- Approve all existing users so they aren't blocked
UPDATE public.profiles SET approved = true;

-- Allow admins (via access_profiles/user_access) to read all profiles for the approval tab
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_access ua
    JOIN public.access_profiles ap ON ap.id = ua.profile_id
    JOIN public.profiles p ON UPPER(p.erp_user) = UPPER(ua.user_login)
    WHERE p.id = auth.uid() AND ap.name = 'Administrador'
  )
);

-- Allow admins to update any profile (for approving users)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_access ua
    JOIN public.access_profiles ap ON ap.id = ua.profile_id
    JOIN public.profiles p ON UPPER(p.erp_user) = UPPER(ua.user_login)
    WHERE p.id = auth.uid() AND ap.name = 'Administrador'
  )
);
