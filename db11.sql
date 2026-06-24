-- DB11: Fix RLS policies for chats table to allow insertion
-- The error "new row violates row-level security policy for table chats" 
-- occurred because there was no INSERT policy defined for authenticated users.

-- 1. Enable users to create their own chat sessions
CREATE POLICY "Users can create own chat"
ON public.chats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. Allow Admins to manage chats (if needed, e.g. delete or update)
CREATE POLICY "Admin full access chats"
ON public.chats FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);
