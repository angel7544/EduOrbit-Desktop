-- 1. Users Table (Managed by Supabase Auth, extended public profile)
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  name text,
  profile_image text,
  is_admin boolean default false,
  email text
);

-- 2. Courses Table
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references public.users(id),
  title text not null,
  description text,
  price numeric default 0,
  thumbnail_url text,
  video_subject text, -- e.g. 'Math', 'Science'
  instructor_name text, -- Manually specified instructor name (optional)
  is_published boolean default false,
  is_featured boolean default false,
  created_at timestamptz default now(),
  purchases_count integer default 0
);

-- 3. Chapters Table
create table if not exists public.chapters (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  description text,
  video_url text, -- YouTube, Bunny, or direct link
  duration numeric, -- in seconds
  position integer, -- for ordering (1, 2, 3...)
  is_demo boolean default false
);

-- 4. Attachments Table (for Chapter resources)
create table if not exists public.attachments (
  id uuid default gen_random_uuid() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade,
  title text,
  file_url text not null,
  file_type text -- e.g. 'pdf', 'zip'
);

-- 5. Purchases/Enrollments Table
create table if not exists public.purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  course_id uuid references public.courses(id),
  amount numeric,
  status text, -- 'success', 'pending', 'failed'
  provider text, -- 'stripe', 'free', etc.
  created_at timestamptz default now()
);

-- 6. Offers Table (for Dashboard banners)
create table if not exists public.offers (
  id uuid default gen_random_uuid() primary key,
  title text,
  description text,
  code text,
  discount_percentage numeric,
  image_url text,
  is_active boolean default true,
  expiry_date timestamptz
);