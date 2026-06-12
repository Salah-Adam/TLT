CREATE TABLE phone_numbers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    number              VARCHAR(20) NOT NULL,
    provider            VARCHAR(50) NOT NULL REFERENCES providers(code),
    classification      VARCHAR(20) NOT NULL DEFAULT 'individual',
    display_name        VARCHAR(100),
    is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    webhook_token       VARCHAR(255) UNIQUE,
    last_sync_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT uq_phone_numbers_number
        UNIQUE (number),

    CONSTRAINT chk_classification
        CHECK (classification IN ('individual', 'business'))
);

CREATE INDEX idx_phone_numbers_user_id
    ON phone_numbers(user_id);

CREATE INDEX idx_phone_numbers_webhook_token
    ON phone_numbers(webhook_token)
    WHERE webhook_token IS NOT NULL;