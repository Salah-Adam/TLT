-- Soft-delete for notifications: hide from the user's feed without losing the row.
ALTER TABLE notifications ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_notifications_is_deleted
    ON notifications(is_deleted)
    WHERE is_deleted = FALSE;