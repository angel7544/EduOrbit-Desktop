-- Add new profile fields to the users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS class_name text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();

-- Optional: Create a policy to allow users to update their own profile
-- (Assuming RLS is enabled, you might need something like this if not already present)
-- create policy "Users can update their own profile"
--   on public.users for update
--   using ( auth.uid() = id );
