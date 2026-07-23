-- sqls/20260623000018-transactions-updated-at-down.sql
ALTER TABLE transactions DROP COLUMN IF EXISTS updated_at;