-- Create certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    certificate_number text NOT NULL,
    issued_at timestamptz DEFAULT now(),
    certificate_url text, -- URL to stored PDF if any
    UNIQUE(user_id, course_id)
);

-- Policies for certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates"
    ON public.certificates
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage certificates"
    ON public.certificates
    FOR ALL
    USING (exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    ));

-- Add completed_at to chapter_progress if not exists (it has updated_at, we can use that if is_completed=true)
-- But maybe useful to track when exactly it was completed for first time?
-- For now we use updated_at when is_completed=true.

-- Function to get student analytics for admin
CREATE OR REPLACE FUNCTION get_student_analytics(student_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_watch_time bigint;
    courses_completed int;
    courses_enrolled int;
    avg_score numeric; -- Placeholder for quiz score if added later
    last_active timestamptz;
    course_progress json;
BEGIN
    -- Total watch time for this student
    SELECT COALESCE(SUM(watch_time_seconds), 0) INTO total_watch_time 
    FROM public.chapter_progress 
    WHERE user_id = student_id;

    -- Courses enrolled
    SELECT COUNT(*) INTO courses_enrolled 
    FROM public.purchases 
    WHERE user_id = student_id AND status = 'success';

    -- Last active
    SELECT MAX(updated_at) INTO last_active 
    FROM public.chapter_progress 
    WHERE user_id = student_id;

    -- Detailed course progress
    -- We need to join purchases -> courses -> chapters -> chapter_progress
    -- To calculate percentage per course
    SELECT json_agg(cp) INTO course_progress
    FROM (
        SELECT 
            c.id as course_id,
            c.title as course_title,
            COUNT(ch.id) as total_chapters,
            COUNT(prog.id) FILTER (WHERE prog.is_completed) as completed_chapters,
            MAX(p.created_at) as enrolled_at,
            -- Check if certificate exists
            EXISTS(SELECT 1 FROM public.certificates cert WHERE cert.user_id = student_id AND cert.course_id = c.id) as has_certificate
        FROM public.purchases p
        JOIN public.courses c ON p.course_id = c.id
        LEFT JOIN public.chapters ch ON c.id = ch.course_id
        LEFT JOIN public.chapter_progress prog ON prog.course_id = c.id AND prog.user_id = student_id AND prog.chapter_id = ch.id
        WHERE p.user_id = student_id AND p.status = 'success'
        GROUP BY c.id, c.title
    ) cp;
    
    -- Courses completed (where completed_chapters = total_chapters and total > 0)
    -- We can count from the json or do a separate query. Let's do separate for simplicity in SQL
    -- Actually, let's derive it in frontend or just count here
    
    RETURN json_build_object(
        'total_watch_time', total_watch_time,
        'courses_enrolled', courses_enrolled,
        'last_active', last_active,
        'course_progress', COALESCE(course_progress, '[]'::json)
    );
END;
$$;
