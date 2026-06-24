-- Enable UUID extension if not already
create extension if not exists "uuid-ossp";

---------------------
-- Core auth profile
---------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  role text check (role in ('student','teacher','admin')) default 'student',
  profile_image text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile"
on public.users for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.users for update
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.users for insert
with check (auth.uid() = id);

create policy "Service role can manage users"
on public.users for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

---------------------
-- Courses
---------------------
create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  price numeric(10,2),
  thumbnail_url text,
  teacher_id uuid references public.users(id),
  is_published boolean default false,
  created_at timestamptz default now()
);

alter table public.courses enable row level security;

-- Everyone can list published courses
create policy "Public can view published courses"
on public.courses for select
using (is_published = true);

-- Teachers can manage their own courses
create policy "Teacher can manage own courses"
on public.courses for all
using (auth.uid() = teacher_id)
with check (auth.uid() = teacher_id);

-- Admin full access
create policy "Admin full access courses"
on public.courses for all
using (exists (
  select 1 from public.users u
  where u.id = auth.uid() and u.role = 'admin'
))
with check (exists (
  select 1 from public.users u
  where u.id = auth.uid() and u.role = 'admin'
));

---------------------
-- Chapters
---------------------
create table if not exists public.chapters (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  is_demo boolean default false,
  order_no integer,
  created_at timestamptz default now()
);

alter table public.chapters enable row level security;

-- Read chapters of published courses
create policy "Public can view chapters of published courses"
on public.chapters for select
using (
  exists (
    select 1 from public.courses c
    where c.id = course_id and c.is_published = true
  )
);

---------------------
-- Videos
---------------------
create table if not exists public.videos (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  video_url text,
  duration integer,
  is_preview boolean default false,
  release_date timestamptz,
  created_at timestamptz default now()
);

alter table public.videos enable row level security;

-- Students can see video metadata for chapters of published courses
create policy "Public can view videos of published courses"
on public.videos for select
using (
  exists (
    select 1
    from public.chapters ch
    join public.courses c on c.id = ch.course_id
    where ch.id = chapter_id and c.is_published = true
  )
);

---------------------
-- Purchases
---------------------
create table if not exists public.purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null check (status in ('pending','success','failed')),
  amount numeric(10,2) not null,
  provider text not null, -- 'razorpay' or 'stripe'
  provider_payment_id text,
  created_at timestamptz default now()
);

create index if not exists purchases_user_id_idx on public.purchases(user_id);
create index if not exists purchases_course_id_idx on public.purchases(course_id);

alter table public.purchases enable row level security;

-- Students can see their own purchases
create policy "Students see own purchases"
on public.purchases for select
using (auth.uid() = user_id);

-- Service role / edge functions manage purchases
create policy "Service role manage purchases"
on public.purchases for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

---------------------
-- Chat tables
---------------------
create table if not exists public.chats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.chats enable row level security;

create policy "Student can see own chat"
on public.chats for select
using (auth.uid() = user_id);

create policy "Admin can see all chats"
on public.chats for select
using (exists (
  select 1 from public.users u
  where u.id = auth.uid() and u.role = 'admin'
));

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  message text not null,
  created_at timestamptz default now()
);

create index if not exists messages_chat_id_idx on public.messages(chat_id);

alter table public.messages enable row level security;

-- Students and admins can read messages in chats they are part of
create policy "Read messages in own chat"
on public.messages for select
using (
  exists (
    select 1 from public.chats c
    where c.id = chat_id and c.user_id = auth.uid()
  )
  or exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

-- Students can insert messages into own chat
create policy "Students send messages"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.chats c
    where c.id = chat_id and c.user_id = auth.uid()
  )
);

---------------------
-- Notifications
---------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  type text,
  course_id uuid references public.courses(id),
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

-- Everyone authenticated can read notifications
create policy "Auth users read notifications"
on public.notifications for select
using (auth.uid() is not null);

create table if not exists public.notification_reads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  read_at timestamptz default now()
);

create index if not exists notification_reads_user_idx on public.notification_reads(user_id);
create index if not exists notification_reads_notification_idx on public.notification_reads(notification_id);

alter table public.notification_reads enable row level security;

-- Users manage their read markers
create policy "Users manage own notification reads"
on public.notification_reads
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

---------------------
-- Offers
---------------------
create table if not exists public.offers (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  discount_percentage numeric(5,2),
  course_id uuid references public.courses(id),
  is_active boolean default true,
  expiry_date timestamptz,
  created_at timestamptz default now()
);

alter table public.offers enable row level security;

-- Auth users can read active offers
create policy "Auth users read offers"
on public.offers for select
using (auth.uid() is not null);

-- Admin or service role can manage offers
create policy "Admin manage offers"
on public.offers for all
using (exists (
  select 1 from public.users u
  where u.id = auth.uid() and u.role = 'admin'
))
with check (exists (
  select 1 from public.users u
  where u.id = auth.uid() and u.role = 'admin'
));