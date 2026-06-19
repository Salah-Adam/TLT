-- =====================================================================
--  OTP unification + Reclaim support
-- =====================================================================

-- 1) A number may be the registration identity of more than one account
--    over time (previous owner + reclaimer). Active ownership is enforced
--    through phone_numbers below, not here.
ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_phone_number;

-- 2) OTP state no longer lives on the users row.
ALTER TABLE users DROP COLUMN IF EXISTS otp_code;
ALTER TABLE users DROP COLUMN IF EXISTS otp_expires_at;

-- 3) Exactly ONE active owner per number; deactivated history rows remain
--    so the previous owner keeps their past transactions.
ALTER TABLE phone_numbers DROP CONSTRAINT IF EXISTS uq_phone_numbers_number;
CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_numbers_active_number
    ON phone_numbers (number)
    WHERE is_active = TRUE AND deleted_at IS NULL;

-- 4) One OTP store for every flow.
CREATE TABLE otp_challenges (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number  VARCHAR(20)  NOT NULL,
    purpose       VARCHAR(20)  NOT NULL,
    code_hash     VARCHAR(255) NOT NULL,         -- HMAC-SHA256 of the 6-digit code
    user_id       UUID REFERENCES users(id),     -- set for add_phone / password_reset / existing-user reclaim
    payload       JSONB,                          -- pending account data for registration / new-user reclaim
    attempts      SMALLINT     NOT NULL DEFAULT 0,
    expires_at    TIMESTAMPTZ  NOT NULL,
    consumed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_otp_purpose
        CHECK (purpose IN ('registration', 'reclaim', 'add_phone', 'password_reset'))
);

-- One ACTIVE (unconsumed) challenge per (number, purpose); re-requests refresh it.
CREATE UNIQUE INDEX uq_otp_active
    ON otp_challenges (phone_number, purpose)
    WHERE consumed_at IS NULL;

CREATE INDEX idx_otp_expires_at ON otp_challenges (expires_at);