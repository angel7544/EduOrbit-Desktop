-- DB08: Admin Capabilities & Chapter Visibility Fixes

-- 1. Ensure 'chapters' table has all necessary columns
ALTER TABLE public.chapters 
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS duration integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- 2. Ensure RLS is enabled on 'chapters'
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing restrictive policies on 'chapters' to avoid conflicts
DROP POLICY IF EXISTS "Public can view chapters of published courses" ON public.chapters;
DROP POLICY IF EXISTS "chapters_no_violations" ON public.chapters;

-- 4. Create explicit policies for 'chapters'

-- A. Public/Students can view chapters ONLY if the course is published
CREATE POLICY "Public view chapters of published courses"
ON public.chapters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id AND c.is_published = true
  )
);

-- B. Admins have FULL access to chapters (regardless of published status)
CREATE POLICY "Admin full access chapters"
ON public.chapters FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- C. Teachers can manage chapters for their OWN courses
CREATE POLICY "Teacher manage own course chapters"
ON public.chapters FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id AND c.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id AND c.teacher_id = auth.uid()
  )
);

-- 5. Enable Admin to view ALL users (for Admin Users Screen)
-- (Existing policy only allows users to view their own profile)
CREATE POLICY "Admin view all users"
ON public.users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- 6. Enable Admin to manage purchases (Assign courses manually)
-- (Existing policy only allows users to insert their own purchases)
CREATE POLICY "Admin manage purchases"
ON public.purchases FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);
