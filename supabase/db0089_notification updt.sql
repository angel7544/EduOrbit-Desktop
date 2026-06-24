-- Create notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  type text check (type in ('general', 'course_update', 'live_class', 'offer', 'system')) default 'general',
  course_id uuid references public.courses(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add user_id column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'notifications' and column_name = 'user_id') then
    alter table public.notifications add column user_id uuid references auth.users(id) on delete cascade;
  end if;
end $$;

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
-- Drop existing policies to avoid conflicts
drop policy if exists "Admins can do everything with notifications" on public.notifications;
drop policy if exists "Users can read own or global notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;

-- Admins can do everything
create policy "Admins can do everything with notifications"
  on public.notifications
  for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Users can read their own notifications OR global notifications (user_id is null)
create policy "Users can read own or global notifications"
  on public.notifications
  for select
  using (
    auth.uid() = user_id or user_id is null
  );

-- Users can update (mark as read) their own notifications
create policy "Users can update own notifications"
  on public.notifications
  for update
  using (
    auth.uid() = user_id
  );

-- give me schem for offer_id column of notification in the schema code sql code
ALTER TABLE notifications
ADD COLUMN offer_id uuid,
ADD CONSTRAINT notifications_offer_id_fkey
  FOREIGN KEY (offer_id) REFERENCES offers(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX idx_notifications_offer_id ON notifications (offer_id);

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS image_url text;
