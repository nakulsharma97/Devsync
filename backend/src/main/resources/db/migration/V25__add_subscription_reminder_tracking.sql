-- Track when the last renewal reminder email was sent for a subscription,
-- to prevent duplicate reminder emails from the scheduled job.
ALTER TABLE subscriptions
    ADD COLUMN last_reminder_sent_at DATETIME(6) NULL;
