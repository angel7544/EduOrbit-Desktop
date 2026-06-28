-- 1. Ensure the helper function exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Drop existing slow policies on purchases and users
DROP POLICY IF EXISTS "Admins can view all purchases" ON purchases;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- 3. Recreate the policies using the optimized is_admin() function
-- Policy to allow admins to view all purchases
CREATE POLICY "Admins can view all purchases"
ON purchases FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

-- Policy to allow admins to view all users (if not already present)
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
  public.is_admin()
);
