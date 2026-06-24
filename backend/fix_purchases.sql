-- Fix purchases table schema
ALTER TABLE public.purchases 
ADD COLUMN IF NOT EXISTS provider_payment_id text,
ADD COLUMN IF NOT EXISTS coupon_code text,
ADD COLUMN IF NOT EXISTS expiry_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_status text CHECK (subscription_status IN ('active', 'expired')) DEFAULT 'active';

-- Ensure Service Role can insert
DROP POLICY IF EXISTS "Service role manage purchases" ON public.purchases;
CREATE POLICY "Service role manage purchases"
ON public.purchases FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
