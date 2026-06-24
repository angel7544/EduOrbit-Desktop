-- Add description column to chapters table
ALTER TABLE public.chapters 
ADD COLUMN IF NOT EXISTS description TEXT;
