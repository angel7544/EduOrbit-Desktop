-- DB05: File Uploads, Notifications, and Manual Course Assignment Support

---------------------
-- Attachments (PDFs, resources for chapters)
---------------------
create table if not exists public.attachments (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  file_url text not null,
  file_type text, -- 'pdf', 'image', etc.
  created_at timestamptz default now()
);

alter table public.attachments enable row level security;

-- Public can view attachments of published courses
create policy "Public can view attachments of published courses"
on public.attachments for select
using (
  exists (
    select 1
    from public.chapters ch
    join public.courses c on c.id = ch.course_id
    where ch.id = chapter_id and c.is_published = true
  )
);

-- Teachers/Admins can manage attachments
create policy "Teachers can manage attachments"
on public.attachments for all
using (
  exists (
    select 1
    from public.chapters ch
    join public.courses c on c.id = ch.course_id
    where c.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chapters ch
    join public.courses c on c.id = ch.course_id
    where c.teacher_id = auth.uid()
  )
);

create policy "Admin full access attachments"
on public.attachments for all
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

---------------------
-- Notifications
---------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  type text default 'info', -- 'info', 'alert', 'course_update'
  target_user_id uuid references public.users(id), -- null means broadcast to all
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

-- Users can see their own notifications or broadcast ones
create policy "Users see own or broadcast notifications"
on public.notifications for select
using (
  target_user_id = auth.uid() or target_user_id is null
);

-- Admin can manage notifications
create policy "Admin manage notifications"
on public.notifications for all
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

---------------------
-- Storage Buckets (if not exists)
---------------------
-- Note: Buckets usually need to be created via API or Dashboard, but policies can be set here if the bucket exists.
-- We assume a bucket named 'course-content' exists.
-- You MUST create a bucket named 'course-content' in Supabase Dashboard > Storage.

-- Policy to allow public read of course-content
-- (This part usually requires direct dashboard configuration or specific storage schema SQL which varies by Supabase version, 
--  so we will skip SQL creation of buckets and assume manual creation or use 'public' bucket if available).
