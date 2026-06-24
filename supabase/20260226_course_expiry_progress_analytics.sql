-- Analytics functions
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_watch_time bigint;
    avg_completion numeric;
    most_watched_chapter text;
    peak_hour int;
BEGIN
    -- Total watch time
    SELECT COALESCE(SUM(watch_time_seconds), 0) INTO total_watch_time FROM public.chapter_progress;
    
    -- Average completion rate (percentage of chapters completed vs started)
    SELECT COALESCE(AVG(CASE WHEN is_completed THEN 100 ELSE 0 END), 0) INTO avg_completion FROM public.chapter_progress;
    
    -- Most watched chapter (by unique users)
    SELECT c.title INTO most_watched_chapter
    FROM public.chapter_progress cp
    JOIN public.chapters c ON c.id = cp.chapter_id
    GROUP BY c.title
    ORDER BY COUNT(DISTINCT cp.user_id) DESC
    LIMIT 1;
    
    -- Peak traffic hour (UTC)
    SELECT EXTRACT(HOUR FROM updated_at)::int INTO peak_hour
    FROM public.chapter_progress
    GROUP BY 1
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    RETURN json_build_object(
        'total_watch_time', total_watch_time,
        'avg_completion', ROUND(avg_completion, 2),
        'most_watched_chapter', COALESCE(most_watched_chapter, 'None'),
        'peak_hour', COALESCE(peak_hour, 0)
    );
END;
$$;
