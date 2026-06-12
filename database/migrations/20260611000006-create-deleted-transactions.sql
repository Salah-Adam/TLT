CREATE TABLE deleted_transactions (
    id                  UUID PRIMARY KEY,
    original_data       JSONB NOT NULL,
    phone_number_id     UUID NOT NULL,
    user_id             UUID NOT NULL REFERENCES users(id),
    deleted_by_user_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    permanent_delete_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
    is_recovered        BOOLEAN NOT NULL DEFAULT FALSE,
    recovered_at        TIMESTAMPTZ,

    CONSTRAINT chk_recovered_at
        CHECK (
            (is_recovered = FALSE AND recovered_at IS NULL) OR
            (is_recovered = TRUE AND recovered_at IS NOT NULL)
        )
);

CREATE INDEX idx_deleted_transactions_user_id
    ON deleted_transactions(user_id);

CREATE INDEX idx_deleted_transactions_permanent_delete
    ON deleted_transactions(permanent_delete_at)
    WHERE is_recovered = FALSE;