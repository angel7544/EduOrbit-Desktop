-- Fix infinite recursion in RLS policies for admin users

-- 1. Create a secure function to check admin status
-- SECURITY DEFINER allows this function to bypass RLS when executed
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Drop the problematic recursive policy on users table
DROP POLICY IF EXISTS "Admin view all users" ON public.users;

-- 3. Re-create the policy using the non-recursive function
CREATE POLICY "Admin view all users"
ON public.users FOR SELECT
USING (
  public.is_admin()
);

-- 4. Update other policies to use the helper function (safer and cleaner)

-- Purchases
DROP POLICY IF EXISTS "Admin manage purchases" ON public.purchases;
CREATE POLICY "Admin manage purchases"
ON public.purchases FOR ALL
USING (
  public.is_admin()
);

-- Chapters
DROP POLICY IF EXISTS "Admin manage chapters" ON public.chapters;
CREATE POLICY "Admin manage chapters"
ON public.chapters FOR ALL
USING (
  public.is_admin()
);

-- Courses
DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;
CREATE POLICY "Admin manage courses"
ON public.courses FOR ALL
USING (
  public.is_admin()
);

-- Attachments
DROP POLICY IF EXISTS "Admin manage attachments" ON public.attachments;
CREATE POLICY "Admin manage attachments"
ON public.attachments FOR ALL
USING (
  public.is_admin()
);
