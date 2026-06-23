ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMPTZ;
UPDATE transactions SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE transactions ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE transactions ALTER COLUMN updated_at SET NOT NULL;