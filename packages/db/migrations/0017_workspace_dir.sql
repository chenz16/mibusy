-- Migration 0017: CEO workspace sandbox
--
-- A filesystem path where agents can read/write files (shared documents,
-- references, drafts, exported deliverables). Worker process will chdir
-- here before running Hermes so the agent's file tools work in this dir.
--
-- Examples:
--   /Users/chen/mibusy-workspace
--   ~/Dropbox/Mibusy   (auto-syncs across devices)
--   /home/chen/projects/current

ALTER TABLE desks
  ADD COLUMN IF NOT EXISTS workspace_dir TEXT;
