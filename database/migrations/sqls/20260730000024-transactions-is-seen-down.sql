-- sqls/…-transactions-is-seen-down.sql
DROP INDEX IF EXISTS idx_tx_unseen;
ALTER TABLE transactions DROP COLUMN is_seen;