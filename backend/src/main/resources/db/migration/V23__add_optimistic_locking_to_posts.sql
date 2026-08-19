-- Add optimistic locking version column to feed_posts.
-- Existing rows get version=0 (no conflict with existing data).
ALTER TABLE feed_posts ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
