-- sqls/20260714000023-otp-request-throttle-down.sql
ALTER TABLE otp_challenges DROP COLUMN IF EXISTS last_sent_at;
ALTER TABLE otp_challenges DROP COLUMN IF EXISTS window_started_at;
ALTER TABLE otp_challenges DROP COLUMN IF EXISTS send_count;