CREATE TABLE user_encryption_keys (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    encrypted_dek       TEXT NOT NULL,
    kek_version         VARCHAR(50) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at          TIMESTAMPTZ,

    CONSTRAINT uq_user_encryption_keys_user
        UNIQUE (user_id)
);