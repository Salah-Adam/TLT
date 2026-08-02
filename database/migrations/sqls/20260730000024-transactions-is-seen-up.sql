-- sqls/…-transactions-is-seen-up.sql
ALTER TABLE transactions ADD COLUMN is_seen BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE transactions SET is_seen = TRUE;   -- existing rows aren't "new/unread"
CREATE INDEX IF NOT EXISTS idx_tx_unseen ON transactions (user_id) WHERE is_seen = FALSE AND is_deleted = FALSE;