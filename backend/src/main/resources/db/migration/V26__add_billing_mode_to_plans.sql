-- Add billing_mode to plans: ONE_TIME (default, manual renewal) or RECURRING (Stripe subscription)
ALTER TABLE plans ADD COLUMN billing_mode VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME';
