-- FIX: Ensure Admin Access to User Courses
-- This script resets and re-creates the necessary RLS policies to allow admins to view user purchases.

-- 1. Helper function (Security Definer to bypass RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from users
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- 2. Purchases Table Policies
alter table purchases enable row level security;

-- Drop ALL existing select policies to be clean
drop policy if exists "Users can view own purchases" on purchases;
drop policy if exists "Admins can view all purchases" on purchases;
drop policy if exists "Enable read access for all users" on purchases;
drop policy if exists "Enable read access for users based on user_id" on purchases;
drop policy if exists "Users view own, Admins view all" on purchases; -- Drop if created before

-- Create the ONE correct select policy
create policy "Users view own, Admins view all"
on purchases for select
to authenticated
using (
  auth.uid() = user_id or is_admin()
);

-- Delete policy (for revoking)
drop policy if exists "Admins can delete purchases" on purchases;
create policy "Admins can delete purchases"
on purchases for delete
to authenticated
using ( is_admin() );


-- 3. Users Table Policies (Fix recursion)
alter table users enable row level security;

drop policy if exists "Users can see their own profile" on users;
drop policy if exists "Admins can view all users" on users;
drop policy if exists "Public profiles" on users;
drop policy if exists "Users view own, Admins view all" on users; -- Drop if created before

create policy "Users view own, Admins view all"
on users for select
to authenticated
using (
  auth.uid() = id or is_admin()
);

-- 4. Courses Table (Ensure published is visible)
alter table courses enable row level security;

drop policy if exists "Public courses are visible" on courses;
create policy "Public courses are visible"
on courses for select
to authenticated
using ( true ); 
