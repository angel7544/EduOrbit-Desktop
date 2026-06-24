-- Add expiry settings to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS expiry_days integer DEFAULT 180;

-- Add expiry to purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS expiry_date timestamptz;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS subscription_status text CHECK (subscription_status IN ('active', 'expired')) DEFAULT 'active';

-- Create progress table
CREATE TABLE IF NOT EXISTS public.chapter_progress (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    is_completed boolean DEFAULT false,
    watch_time_seconds integer DEFAULT 0,
    last_position_seconds integer DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, chapter_id)
);

-- Policies for chapter_progress
ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress"
    ON public.chapter_progress
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
    ON public.chapter_progress
    FOR SELECT
    USING (exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    ));

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chapter_progress_updated_at
BEFORE UPDATE ON public.chapter_progress
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
