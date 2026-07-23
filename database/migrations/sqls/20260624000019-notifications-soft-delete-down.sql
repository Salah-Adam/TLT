-- sqls/20260624000019-notifications-soft-delete-down.sql
DROP INDEX IF EXISTS idx_notifications_is_deleted;
ALTER TABLE notifications DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE notifications DROP COLUMN IF EXISTS is_deleted;