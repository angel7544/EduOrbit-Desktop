-- Allow users to insert their own purchases (for client-side payment flow)
-- This is required because we are handling payments on the client side without a backend server
create policy "Users can insert own purchases"
on public.purchases for insert
with check (auth.uid() = user_id);
