-- DB025: Add streak columns to public.users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS streak_count integer default 1,
ADD COLUMN IF NOT EXISTS streak_last_date date;
