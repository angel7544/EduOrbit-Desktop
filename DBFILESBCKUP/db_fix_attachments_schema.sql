-- Fix for missing columns in attachments table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS chapter_id uuid references public.chapters(id) on delete cascade;

-- Reload schema cache (notify PostgREST)
NOTIFY pgrst, 'reload config';
