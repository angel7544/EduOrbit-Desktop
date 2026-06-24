-- Function to allow users to delete their own account
-- This cleans up related data and deletes the auth.users record
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Clean up Notifications
  -- (Notifications targeting the user might not have ON DELETE CASCADE)
  -- Note: We skip deleting from public.notifications because the user_id/target_user_id column 
  -- might not exist in some schema versions. If it exists and enforces FK, this might need adjustment.
  -- delete from public.notifications where user_id = current_user_id;
  
  -- public.notification_reads has ON DELETE CASCADE, but explicit delete is safer/clearer
  delete from public.notification_reads where user_id = current_user_id;

  -- 2. Clean up Messages
  -- (Messages sent by user might not have ON DELETE CASCADE)
  delete from public.messages where sender_id = current_user_id;

  -- 3. Clean up Courses (if user is a teacher)
  -- (Cascades to chapters, videos, attachments)
  delete from public.courses where teacher_id = current_user_id;

  -- 4. Delete the User Account
  -- (This will cascade to public.users, purchases, chats, etc. via standard FKs)
  delete from auth.users where id = current_user_id;
end;
$$;
