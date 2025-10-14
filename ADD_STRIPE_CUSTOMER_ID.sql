-- Add stripe_customer_id field to parents table
-- This stores the Stripe customer ID for charging saved payment methods

ALTER TABLE parents ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parents_stripe_customer_id ON parents(stripe_customer_id);

-- Add comment
COMMENT ON COLUMN parents.stripe_customer_id IS 'Stripe customer ID for charging saved payment methods';
