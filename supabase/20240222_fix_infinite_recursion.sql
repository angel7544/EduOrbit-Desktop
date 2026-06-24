-- Fix for infinite recursion in RLS policies

-- 1. Create a secure function to check admin status
-- This function uses SECURITY DEFINER to bypass RLS when checking the users table
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

-- 2. Drop existing problematic policies that cause recursion
-- Note: Policy names must match exactly what was created before
drop policy if exists "Admins can view all users" on users;
drop policy if exists "Admins can view all purchases" on purchases;

-- 3. Re-create policies using the non-recursive function

-- Policy for Users table:
-- Users can see their own profile OR Admins can see everyone
create policy "Admins can view all users"
on users for select
to authenticated
using (
  auth.uid() = id or is_admin()
);

-- Policy for Purchases table:
-- Users can see their own purchases OR Admins can see everyone's purchases
create policy "Admins can view all purchases"
on purchases for select
to authenticated
using (
  auth.uid() = user_id or is_admin()
);
