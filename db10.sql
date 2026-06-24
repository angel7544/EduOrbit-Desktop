-- DB10: Add live stream support to chapters
ALTER TABLE public.chapters 
ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS live_starts_at timestamptz,
ADD COLUMN IF NOT EXISTS live_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS live_status text CHECK (live_status IN ('Recorded','SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'));
