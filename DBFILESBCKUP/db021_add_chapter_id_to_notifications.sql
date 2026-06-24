-- Add chapter_id to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL;

-- Ensure course_id exists (it probably does based on code, but good to be safe)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
