-- Enable RLS on tables
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own chats
CREATE POLICY "Users can view their own chats" ON chats
FOR SELECT
USING (auth.uid() = user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Policy: Users can create new chats for themselves
CREATE POLICY "Users can create chats" ON chats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chats (e.g. close them), Admins can update any
CREATE POLICY "Users can update own chats" ON chats
FOR UPDATE
USING (auth.uid() = user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Policy: Users can view messages in their chats
CREATE POLICY "Users can view messages in their chats" ON messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = messages.chat_id
    AND (chats.user_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  )
);

-- Policy: Users can insert messages into their chats
CREATE POLICY "Users can insert messages" ON messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = messages.chat_id
    AND (chats.user_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  )
  AND auth.uid() = sender_id
);

-- Realtime: Enable publication for these tables to listen to changes
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
