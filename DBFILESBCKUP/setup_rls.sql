-- Enable RLS on tables
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts, though 'create policy if not exists' is not standard sql, we usually drop first)
DROP POLICY IF EXISTS "Enable read access for enrolled users or demo chapters" ON chapters;
DROP POLICY IF EXISTS "Enable read access for enrolled users or demo chapter attachments" ON attachments;

-- Policy for chapters
-- Logic: Allow if chapter is demo OR user has a valid purchase for the course
CREATE POLICY "Enable read access for enrolled users or demo chapters"
ON chapters
FOR SELECT
TO authenticated
USING (
  (is_demo = true)
  OR
  (EXISTS (
    SELECT 1
    FROM purchases
    WHERE purchases.course_id = chapters.course_id
    AND purchases.user_id = auth.uid()
    AND purchases.status = 'success'
    AND (purchases.expiry_date IS NULL OR purchases.expiry_date > now())
  ))
);

-- Policy for attachments
-- Logic: Allow if the parent chapter is accessible (demo or purchased)
CREATE POLICY "Enable read access for enrolled users or demo chapter attachments"
ON attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM chapters
    WHERE chapters.id = attachments.chapter_id
    AND (
      (chapters.is_demo = true)
      OR
      (EXISTS (
        SELECT 1
        FROM purchases
        WHERE purchases.course_id = chapters.course_id
        AND purchases.user_id = auth.uid()
        AND purchases.status = 'success'
        AND (purchases.expiry_date IS NULL OR purchases.expiry_date > now())
      ))
    )
  )
);
