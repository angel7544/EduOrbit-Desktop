-- DB026: Create course_reviews table and RLS policies

CREATE TABLE IF NOT EXISTS public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now(),
  -- Ensure a user can only review a course once
  unique (course_id, user_id)
);

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (public and authenticated) can select/read reviews
CREATE POLICY "Anyone can view course reviews"
ON public.course_reviews FOR SELECT
USING (true);

-- 2. Authenticated users who have purchased/enrolled in the course can write a review
CREATE POLICY "Purchased users can write a review"
ON public.course_reviews FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  exists (
    select 1 from public.purchases p
    where p.course_id = course_id and p.user_id = auth.uid() and p.status = 'success'
  )
);

-- 3. Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON public.course_reviews FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
ON public.course_reviews FOR DELETE
USING (auth.uid() = user_id);
