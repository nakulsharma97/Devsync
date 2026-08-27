-- Add stripe_price_id for Stripe subscription checkout (only needed for RECURRING plans)
ALTER TABLE plans ADD COLUMN stripe_price_id VARCHAR(100) NULL;
