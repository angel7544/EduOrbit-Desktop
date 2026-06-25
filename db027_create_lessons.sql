-- DB027: Create lessons table and RLS policies
CREATE TABLE IF NOT EXISTS public.lessons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    video_url text,
    duration numeric DEFAULT 0,
    position integer DEFAULT 1,
    is_published boolean DEFAULT false,
    is_free boolean DEFAULT false,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Policies for lessons
CREATE POLICY "Public lessons are viewable by everyone." ON public.lessons
    FOR SELECT USING (is_published = true);

CREATE POLICY "Users can view all lessons for purchased courses." ON public.lessons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chapters c
            JOIN public.purchases p ON p.course_id = c.course_id
            WHERE c.id = lessons.chapter_id AND p.user_id = auth.uid() AND p.status = 'success'
        )
    );

CREATE POLICY "Instructors can manage lessons in their courses." ON public.lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.chapters c
            JOIN public.courses co ON co.id = c.course_id
            WHERE c.id = lessons.chapter_id AND co.instructor_id = auth.uid()
        )
    );
