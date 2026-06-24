-- Enhanced analytics function
CREATE OR REPLACE FUNCTION get_admin_analytics_v2()
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
BEGIN
    -- Total watch time
    SELECT COALESCE(SUM(watch_time_seconds), 0) INTO total_watch_time FROM public.chapter_progress;
    
    -- Average completion rate
    SELECT COALESCE(AVG(CASE WHEN is_completed THEN 100 ELSE 0 END), 0) INTO avg_completion FROM public.chapter_progress;
    
    -- Most watched chapter
    SELECT c.title INTO most_watched_chapter
    FROM public.chapter_progress cp
    JOIN public.chapters c ON c.id = cp.chapter_id
    GROUP BY c.title
    ORDER BY COUNT(DISTINCT cp.user_id) DESC
    LIMIT 1;
    
    -- Peak traffic hour
    SELECT EXTRACT(HOUR FROM updated_at)::int INTO peak_hour
    FROM public.chapter_progress
    GROUP BY 1
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- Instructor Stats
    SELECT json_agg(stats) INTO instructor_stats
    FROM (
        SELECT 
            COALESCE(c.instructor_name, u.name, 'Unknown') as name,
            COUNT(DISTINCT c.id) as total_courses,
            COUNT(DISTINCT p.user_id) as total_students,
            COALESCE(SUM(p.amount), 0) as total_revenue
        FROM public.courses c
        LEFT JOIN public.users u ON c.teacher_id = u.id
        LEFT JOIN public.purchases p ON c.id = p.course_id AND p.status = 'success'
        GROUP BY COALESCE(c.instructor_name, u.name, 'Unknown')
        ORDER BY total_revenue DESC
    ) stats;
    
    RETURN json_build_object(
        'total_watch_time', total_watch_time,
        'avg_completion', ROUND(avg_completion, 2),
        'most_watched_chapter', COALESCE(most_watched_chapter, 'None'),
        'peak_hour', COALESCE(peak_hour, 0),
        'instructor_stats', COALESCE(instructor_stats, '[]'::json)
    );
END;
$$;
