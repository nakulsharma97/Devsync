-- =============================================================
-- DevSync Database Schema - V20
-- GitHub-based development workflow for tasks:
--   branch_name        - the feature branch this task is worked on
--   pull_request_number/url/state - the linked GitHub pull request
--   started_at         - when the assignee started work on the task
--   pr_created_at / pr_merged_at - GitHub PR lifecycle timestamps
-- All columns are nullable: tasks without a GitHub workflow are
-- unaffected.
-- =============================================================

ALTER TABLE tasks
    ADD COLUMN branch_name VARCHAR(255) NULL,
    ADD COLUMN pull_request_number BIGINT NULL,
    ADD COLUMN pull_request_url VARCHAR(512) NULL,
    ADD COLUMN pull_request_state VARCHAR(20) NULL,
    ADD COLUMN started_at DATETIME(6) NULL,
    ADD COLUMN pr_created_at DATETIME(6) NULL,
    ADD COLUMN pr_merged_at DATETIME(6) NULL;
