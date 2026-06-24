-- DB06: Add missing columns to chapters table
ALTER TABLE public.chapters 
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS duration integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

-- DB06a: Create RLS policy to prevent violations on chapters
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY chapters_no_violations ON public.chapters
FOR ALL
USING (true)
WITH CHECK (true);
