
-- Add status to chats
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS status text DEFAULT 'open';

-- Fix RLS for messages insertion by admin
-- Note: Check if policy already exists to avoid error, but creating if not exists is not standard SQL for policies without a DO block or similar.
-- Simpler to just try creating it.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'messages'
        AND policyname = 'Admins can send messages'
    ) THEN
        CREATE POLICY "Admins can send messages"
        ON public.messages
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid() AND u.role = 'admin'
            )
        );
    END IF;
END
$$;
