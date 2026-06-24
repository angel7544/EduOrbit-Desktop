-- Add columns for live class scheduling if they don't exist
ALTER TABLE public.chapters 
ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS live_starts_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS live_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS live_status text DEFAULT 'SCHEDULED'; -- Options: 'SCHEDULED', 'LIVE', 'ENDED'