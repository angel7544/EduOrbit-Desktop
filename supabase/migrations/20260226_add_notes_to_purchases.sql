-- Add notes column to purchases table
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS notes text;

-- Add revoked/suspended status if not exists (modifying the check constraint is hard in pure SQL without dropping, 
-- so we will just ensure the column accepts text and trust the app logic or try to add it if possible)
-- But the previous migration used a check constraint.
-- Let's try to drop and recreate the constraint to be safe, or just allow text.

ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_subscription_status_check;
ALTER TABLE public.purchases ADD CONSTRAINT purchases_subscription_status_check CHECK (subscription_status IN ('active', 'expired', 'suspended', 'revoked'));
