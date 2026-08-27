-- Set PRO and ENTERPRISE plans to use Stripe recurring subscriptions.
-- FREE stays ONE_TIME (no payment required).
-- To switch back to manual renewal: UPDATE plans SET billing_mode = 'ONE_TIME' WHERE code IN ('PRO','ENTERPRISE');
UPDATE plans SET billing_mode = 'RECURRING' WHERE code IN ('PRO', 'ENTERPRISE');
