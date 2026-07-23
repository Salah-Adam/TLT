-- OTP request throttling: track how often a code is requested per (number, purpose)
-- so issueChallenge() can enforce a resend cooldown + a rolling per-window cap.
ALTER TABLE otp_challenges
    ADD COLUMN IF NOT EXISTS send_count        SMALLINT    NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS last_sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();