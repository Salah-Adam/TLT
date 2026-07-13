-- Add the 'recover' OTP purpose (account recovery = reactivate a deactivated orphan).
ALTER TABLE otp_challenges DROP CONSTRAINT IF EXISTS chk_otp_purpose;
ALTER TABLE otp_challenges ADD CONSTRAINT chk_otp_purpose
    CHECK (purpose IN ('registration', 'reclaim', 'add_phone', 'password_reset', 'recover'));