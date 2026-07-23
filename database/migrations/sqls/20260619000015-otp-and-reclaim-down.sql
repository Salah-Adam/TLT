-- sqls/20260619000015-otp-and-reclaim-down.sql
-- reverse: drop the otp_challenges table (its indexes drop with it)
DROP TABLE IF EXISTS otp_challenges;

-- reverse: active-number partial index → original full unique constraint
DROP INDEX IF EXISTS uq_phone_numbers_active_number;
ALTER TABLE phone_numbers ADD CONSTRAINT uq_phone_numbers_number UNIQUE (number);

-- reverse: re-add the OTP columns to users
ALTER TABLE users ADD COLUMN otp_code       VARCHAR(10);
ALTER TABLE users ADD COLUMN otp_expires_at TIMESTAMPTZ;

-- reverse: re-add the users phone_number unique constraint
ALTER TABLE users ADD CONSTRAINT uq_users_phone_number UNIQUE (phone_number);