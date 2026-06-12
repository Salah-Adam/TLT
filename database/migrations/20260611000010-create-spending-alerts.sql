CREATE TABLE spending_alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    phone_number_id     UUID REFERENCES phone_numbers(id),
    category_id         UUID NOT NULL REFERENCES categories(id),
    monthly_limit       NUMERIC(15,4) NOT NULL,
    alert_threshold     NUMERIC(5,2) NOT NULL DEFAULT 80.00,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    last_alerted_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_monthly_limit
        CHECK (monthly_limit > 0),

    CONSTRAINT chk_alert_threshold
        CHECK (alert_threshold BETWEEN 1 AND 100),

    CONSTRAINT uq_spending_alert_per_category
        UNIQUE (user_id, phone_number_id, category_id)
);

CREATE INDEX idx_spending_alerts_user_id
    ON spending_alerts(user_id)
    WHERE is_active = TRUE;

CREATE INDEX idx_spending_alerts_category_id
    ON spending_alerts(category_id);