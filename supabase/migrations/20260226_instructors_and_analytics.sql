
-- Create instructors table
CREATE TABLE IF NOT EXISTS public.instructors (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    bio text,
    profile_image text,
    signature_url text,
    total_revenue numeric DEFAULT 0,
    total_students int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Add instructor_id to courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES public.instructors(id);

-- Enable RLS for instructors
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (for course details)
CREATE POLICY "Public instructors are viewable by everyone" 
ON public.instructors FOR SELECT USING (true);

-- Allow write access only to admins
CREATE POLICY "Admins can insert instructors" 
ON public.instructors FOR INSERT WITH CHECK (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

CREATE POLICY "Admins can update instructors" 
ON public.instructors FOR UPDATE USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

CREATE POLICY "Admins can delete instructors" 
ON public.instructors FOR DELETE USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Update analytics function to include instructor breakdown properly
CREATE OR REPLACE FUNCTION get_admin_analytics_v3()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_watch_time bigint;
    avg_completion numeric;
    most_watched_chapter text;
    peak_hour int;
    instructor_stats json;
    revenue_chart json;
BEGIN
    -- Total watch time
    SELECT COALESCE(SUM(watch_time_seconds), 0) INTO total_watch_time FROM public.chapter_progress;

    -- Avg completion
    SELECT COALESCE(AVG(
        CASE WHEN total_chapters > 0 THEN (completed_chapters::numeric / total_chapters::numeric) * 100 ELSE 0 END
    ), 0) INTO avg_completion
    FROM (
        SELECT 
            c.id, 
            (SELECT COUNT(*) FROM public.chapters ch WHERE ch.course_id = c.id) as total_chapters,
            (SELECT COUNT(*) FROM public.chapter_progress cp WHERE cp.course_id = c.id AND cp.is_completed) as completed_chapters
        FROM public.courses c
    ) course_stats;

    -- Most watched chapter
    SELECT title INTO most_watched_chapter 
    FROM public.chapters 
    WHERE id = (
        SELECT chapter_id 
        FROM public.chapter_progress 
        GROUP BY chapter_id 
        ORDER BY SUM(watch_time_seconds) DESC 
        LIMIT 1
    );

    -- Peak hour (UTC)
    SELECT EXTRACT(HOUR FROM updated_at) as hour 
    INTO peak_hour
    FROM public.chapter_progress 
    GROUP BY hour 
    ORDER BY COUNT(*) DESC 
    LIMIT 1;

    -- Instructor Stats (Revenue & Students)
    -- We join purchases -> courses -> instructors
    SELECT json_agg(inst) INTO instructor_stats
    FROM (
        SELECT 
            i.id,
            i.name,
            COUNT(DISTINCT c.id) as total_courses,
            COUNT(DISTINCT p.user_id) as total_students,
            COALESCE(SUM(p.amount), 0) as total_revenue
        FROM public.instructors i
        LEFT JOIN public.courses c ON c.instructor_id = i.id
        LEFT JOIN public.purchases p ON p.course_id = c.id AND p.status = 'success'
        GROUP BY i.id, i.name
    ) inst;
    
    -- Revenue Chart (Last 7 days)
    SELECT json_agg(rev) INTO revenue_chart
    FROM (
        SELECT 
            DATE(created_at) as date,
            SUM(amount) as daily_revenue
        FROM public.purchases
        WHERE status = 'success' AND created_at > (now() - interval '30 days')
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
    ) rev;

    RETURN json_build_object(
        'total_watch_time', total_watch_time,
        'avg_completion', avg_completion,
        'most_watched_chapter', COALESCE(most_watched_chapter, 'None'),
        'peak_hour', COALESCE(peak_hour, 0),
        'instructor_stats', COALESCE(instructor_stats, '[]'::json),
        'revenue_chart', COALESCE(revenue_chart, '[]'::json)
    );
END;
$$;
