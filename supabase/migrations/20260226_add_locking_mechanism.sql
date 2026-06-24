-- Add expiry settings to courses if not exists
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS expiry_days integer DEFAULT 180;

-- Add expiry to purchases if not exists
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS expiry_date timestamptz;
-- Add subscription_status column if not exists (using text to be flexible, but we can add a check constraint if needed)
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

-- Add a check constraint for subscription_status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'purchases_subscription_status_check'
    ) THEN
        ALTER TABLE public.purchases ADD CONSTRAINT purchases_subscription_status_check CHECK (subscription_status IN ('active', 'expired', 'suspended'));
    END IF;
END $$;

-- Update existing purchases to have an expiry date if they don't (default to 180 days from creation)
UPDATE public.purchases
SET expiry_date = created_at + interval '180 days',
    subscription_status = CASE 
        WHEN (created_at + interval '180 days') < now() THEN 'expired'
        ELSE 'active'
    END
WHERE expiry_date IS NULL;
