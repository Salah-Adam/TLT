-- Push device tokens (FCM). One user → many devices. 
-- token is globally UNIQUE so re-registering "claims" the device for the
-- current user (reassigns ownership). Tokens persist across logout.
CREATE TABLE device_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    token        VARCHAR(255) NOT NULL UNIQUE,
    platform     VARCHAR(10),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,

    CONSTRAINT chk_device_platform
        CHECK (platform IS NULL OR platform IN ('ios', 'android'))
);

CREATE INDEX idx_device_tokens_user_active
    ON device_tokens(user_id)
    WHERE is_active = TRUE;