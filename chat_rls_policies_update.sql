-- 1. Create a secure, optimized helper function to check admin status
-- This function uses SECURITY DEFINER to bypass RLS when checking the users table,
-- preventing infinite loops and optimizing the query with STABLE.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Drop existing problematic policies that cause recursion and performance issues
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
DROP POLICY IF EXISTS "Users can update own chats" ON chats;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;

-- 3. Re-create policies using the non-recursive function

-- Policy: Users can view their own chats
CREATE POLICY "Users can view their own chats" ON chats
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Policy: Users can update their own chats (e.g. close them), Admins can update any
CREATE POLICY "Users can update own chats" ON chats
FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

-- Policy: Users can view messages in their chats
CREATE POLICY "Users can view messages in their chats" ON messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = messages.chat_id
    AND (chats.user_id = auth.uid() OR public.is_admin())
  )
);

-- Policy: Users can insert messages into their chats
CREATE POLICY "Users can insert messages" ON messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = messages.chat_id
    AND (chats.user_id = auth.uid() OR public.is_admin())
  )
  AND auth.uid() = sender_id
);
