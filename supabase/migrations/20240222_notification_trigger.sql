
-- Enable the pg_net extension to make HTTP requests
create extension if not exists pg_net;

-- Create the trigger function
create or replace function public.handle_new_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  project_url text := 'https://nkuconqaswmittsxqcbo.supabase.co';
  anon_key text := 'YOUR_ANON_KEY_HERE'; -- We can't easily inject this in SQL, but we can use net.http_post
  -- Ideally, we use the vault or just hardcode the service key if safe, or rely on internal networking if self-hosted.
  -- For Supabase Cloud, we use net.http_post to the Edge Function URL.
  
  -- Alternative: Use the internal network call if possible, but pg_net is standard.
  -- However, we need the Service Role Key or Anon Key to invoke the function if it has 'Enforce JWT'.
  -- If we use the Database Webhooks UI in Dashboard, it handles this.
  -- But to do it via SQL, we need to be careful with keys.
  
  -- ACTUALLY, the best way is to use Supabase's built-in Webhook feature via the UI or API, but we can't do that easily from here.
  -- A common pattern is to just insert the row, and have a separate worker. 
  -- But 'pg_net' is the standard way.
  
begin
  -- We will use the Supabase Edge Function URL.
  -- Note: You typically need to provide the Authorization header.
  -- Since we are in the database, we can use the service_role key if we had it, but hardcoding secrets in SQL is bad.
  -- 
  -- BETTER APPROACH: The user is asking for "another option".
  -- The most robust "other option" that doesn't require hardcoding keys in SQL is to use the Dashboard to create the webhook.
  -- BUT since I am an AI, I can't click the dashboard.
  
  -- Let's try to make the Edge Function 'public' (no Verify JWT) so the database can call it without a key?
  -- No, that's insecure.
  
  -- Wait, Supabase Database Webhooks (in the Dashboard) are just triggers that call an HTTP endpoint.
  -- We can create a trigger that calls the function.
  
  perform
    net.http_post(
      url := 'https://nkuconqaswmittsxqcbo.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true) 
        -- NOTE: app.settings.service_role_key might not be available by default.
        -- If it's not available, we might have to ask the user to set it or use a different method.
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW)
      )
    );
    
  return null;
end;
$$;

-- Drop the trigger to prevent double invocation or errors
drop trigger if exists on_notification_created on public.notifications;

-- Drop the function as well if we are not using it
drop function if exists public.handle_new_notification();
