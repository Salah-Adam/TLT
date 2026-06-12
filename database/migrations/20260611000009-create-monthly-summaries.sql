CREATE TABLE monthly_summaries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number_id         UUID NOT NULL REFERENCES phone_numbers(id),
    user_id                 UUID NOT NULL REFERENCES users(id),
    summary_year            SMALLINT NOT NULL,
    summary_month           SMALLINT NOT NULL,

    -- Transaction totals
    total_in                NUMERIC(15,4) NOT NULL DEFAULT 0,
    total_out               NUMERIC(15,4) NOT NULL DEFAULT 0,
    net                     NUMERIC(15,4) NOT NULL DEFAULT 0,
    transaction_count       INTEGER NOT NULL DEFAULT 0,
    transaction_count_in    INTEGER NOT NULL DEFAULT 0,
    transaction_count_out   INTEGER NOT NULL DEFAULT 0,

    -- Highlights
    largest_transaction_in  NUMERIC(15,4),
    largest_transaction_out NUMERIC(15,4),
    busiest_day             DATE,
    busiest_hour            SMALLINT,

    -- Pre-computed breakdowns
    category_breakdown      JSONB NOT NULL DEFAULT '{}',
    hourly_breakdown        JSONB NOT NULL DEFAULT '{}',
    daily_trend             JSONB NOT NULL DEFAULT '[]',
    top_counterparties_enc  TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_monthly_summaries_number_month
        UNIQUE (phone_number_id, summary_year, summary_month),

    CONSTRAINT chk_month
        CHECK (summary_month BETWEEN 1 AND 12),

    CONSTRAINT chk_year
        CHECK (summary_year >= 2026),

    CONSTRAINT chk_busiest_hour
        CHECK (busiest_hour IS NULL OR busiest_hour BETWEEN 0 AND 23),

    CONSTRAINT chk_total_in
        CHECK (total_in >= 0),

    CONSTRAINT chk_total_out
        CHECK (total_out >= 0),

    CONSTRAINT chk_transaction_count
        CHECK (transaction_count >= 0)
);

CREATE INDEX idx_monthly_summaries_user
    ON monthly_summaries(user_id, summary_year DESC, summary_month DESC);

CREATE INDEX idx_monthly_summaries_number
    ON monthly_summaries(phone_number_id, summary_year DESC, summary_month DESC);