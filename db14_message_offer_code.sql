-- 1. Fix Notification RLS Error
-- Allow authenticated users (admins) to create notifications
create policy "Enable insert for authenticated users"
on notifications for insert
to authenticated
with check (true);

-- 2. Add columns for Offer Image and Course Link
-- These are required for the new "Thumbnail" and "Select Course" features
alter table offers 
add column if not exists course_id uuid references courses(id),
add column if not exists image_url text;