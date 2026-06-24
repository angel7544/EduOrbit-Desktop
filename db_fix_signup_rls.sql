-- Fix for "new row level security violates" error during signup
-- This policy allows authenticated users to insert their own profile row into the public.users table.

create policy "Users can insert own profile"
on public.users for insert
with check (auth.uid() = id);
