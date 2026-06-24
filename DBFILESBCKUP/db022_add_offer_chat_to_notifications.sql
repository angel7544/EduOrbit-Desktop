-- Add offer_id and chat_id to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL;
