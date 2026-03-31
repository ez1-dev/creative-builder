
-- 1. Create SECURITY DEFINER function to check admin status without RLS
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_access ua
    JOIN access_profiles ap ON ap.id = ua.profile_id
    JOIN profiles p ON upper(p.erp_user) = upper(ua.user_login)
    WHERE p.id = _uid AND ap.name = 'Administrador'
  );
$$;

-- 2. Drop existing admin policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 3. Recreate admin policies using the new function
CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));
