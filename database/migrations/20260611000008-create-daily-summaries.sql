CREATE TABLE daily_summaries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number_id         UUID NOT NULL REFERENCES phone_numbers(id),
    user_id                 UUID NOT NULL REFERENCES users(id),
    summary_date            DATE NOT NULL,

    -- Transaction totals
    total_in                NUMERIC(15,4) NOT NULL DEFAULT 0,
    total_out               NUMERIC(15,4) NOT NULL DEFAULT 0,
    net                     NUMERIC(15,4) NOT NULL DEFAULT 0,
    transaction_count       INTEGER NOT NULL DEFAULT 0,
    transaction_count_in    INTEGER NOT NULL DEFAULT 0,
    transaction_count_out   INTEGER NOT NULL DEFAULT 0,

    -- Largest transactions
    largest_transaction_in  NUMERIC(15,4),
    largest_transaction_out NUMERIC(15,4),

    -- Balance
    closing_balance         NUMERIC(15,4),

    -- Pre-computed breakdowns
    category_breakdown      JSONB NOT NULL DEFAULT '{}',
    hourly_breakdown        JSONB NOT NULL DEFAULT '{}',

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_daily_summaries_number_date
        UNIQUE (phone_number_id, summary_date),

    CONSTRAINT chk_total_in
        CHECK (total_in >= 0),

    CONSTRAINT chk_total_out
        CHECK (total_out >= 0),

    CONSTRAINT chk_transaction_count
        CHECK (transaction_count >= 0)
);

CREATE INDEX idx_daily_summaries_user_date
    ON daily_summaries(user_id, summary_date DESC);

CREATE INDEX idx_daily_summaries_number_date
    ON daily_summaries(phone_number_id, summary_date DESC);