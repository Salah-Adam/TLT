-- ── users table ───────────────────────────────────────────────────────────────

-- Drop columns no longer needed
ALTER TABLE users DROP COLUMN IF EXISTS username;
ALTER TABLE users DROP COLUMN IF EXISTS is_verified;
ALTER TABLE users DROP COLUMN IF EXISTS account_type;

-- Make email optional
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);

-- Add required columns (NOT NULL — safe because table is empty)
ALTER TABLE users ADD COLUMN full_name    VARCHAR(100) NOT NULL;
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)  NOT NULL;

-- Add OTP columns (nullable — filled temporarily during OTP flow, cleared after)
ALTER TABLE users ADD COLUMN otp_code        VARCHAR(10);
ALTER TABLE users ADD COLUMN otp_expires_at  TIMESTAMPTZ;

-- Add optional profile columns (nullable — filled progressively)
ALTER TABLE users ADD COLUMN age  INTEGER;
ALTER TABLE users ADD COLUMN city VARCHAR(100);
ALTER TABLE users ADD COLUMN sex  VARCHAR(10);

-- Constraints
ALTER TABLE users ADD CONSTRAINT uq_users_phone_number
    UNIQUE (phone_number);

ALTER TABLE users ADD CONSTRAINT chk_users_sex
    CHECK (sex IN ('male', 'female'));

ALTER TABLE users ADD CONSTRAINT chk_users_age
    CHECK (age IS NULL OR (age >= 10 AND age <= 100));

-- ── phone_numbers table ───────────────────────────────────────────────────────

ALTER TABLE phone_numbers ADD COLUMN previous_user_id UUID
    REFERENCES users(id);

ALTER TABLE phone_numbers ADD COLUMN reclaimed_at TIMESTAMPTZ;

-- ── notifications table ───────────────────────────────────────────────────────

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_type;

ALTER TABLE notifications ADD CONSTRAINT chk_type
    CHECK (type IN (
        'transaction_received',
        'transaction_sent',
        'spending_alert',
        'daily_summary',
        'weekly_summary',
        'monthly_summary',
        'report_ready',
        'trial_ending',
        'account',
        'number_reclaimed'
    ));