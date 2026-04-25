-- Fix privilege escalation: restrict writes on access control tables to admins only,
-- and restrict reads to authenticated users.

-- access_profiles
DROP POLICY IF EXISTS "Allow all access to access_profiles" ON public.access_profiles;

CREATE POLICY "Authenticated can read access_profiles"
ON public.access_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage access_profiles"
ON public.access_profiles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- user_access
DROP POLICY IF EXISTS "Allow all access to user_access" ON public.user_access;

CREATE POLICY "Authenticated can read user_access"
ON public.user_access
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage user_access"
ON public.user_access
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- profile_screens (same permissive policy, fix for consistency)
DROP POLICY IF EXISTS "Allow all access to profile_screens" ON public.profile_screens;

CREATE POLICY "Authenticated can read profile_screens"
ON public.profile_screens
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage profile_screens"
ON public.profile_screens
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));