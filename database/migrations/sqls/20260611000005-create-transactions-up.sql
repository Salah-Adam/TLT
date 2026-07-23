CREATE TABLE transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number_id         UUID NOT NULL REFERENCES phone_numbers(id),
    user_id                 UUID NOT NULL REFERENCES users(id),
    provider                VARCHAR(50) NOT NULL REFERENCES providers(code),

    -- Core financial fields (stored plain for analytics)
    amount                  NUMERIC(15,4) NOT NULL,
    currency                VARCHAR(10) NOT NULL DEFAULT 'USD',
    type                    VARCHAR(30) NOT NULL,
    direction               VARCHAR(10) NOT NULL,
    balance_after           NUMERIC(15,4),
    service_charge          NUMERIC(15,4) NOT NULL DEFAULT 0,

    -- Time fields
    transacted_at           TIMESTAMPTZ NOT NULL,
    transacted_date         DATE NOT NULL,
    transacted_hour         SMALLINT NOT NULL,
    transacted_day_of_week  SMALLINT NOT NULL,

    -- Encrypted sensitive fields
    counterparty_name_enc   TEXT,
    counterparty_phone_enc  TEXT,
    counterparty_phone_hash VARCHAR(255),

    -- Plain reference fields
    provider_reference      VARCHAR(100),

    -- Raw source (encrypted)
    raw_sms_enc             TEXT,

    -- Categorization
    category_id             UUID REFERENCES categories(id),
    is_auto_categorized     BOOLEAN NOT NULL DEFAULT FALSE,

    -- User notes
    note                    TEXT,

    -- Status
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,

    -- Duplicate prevention
    idempotency_key         VARCHAR(255) UNIQUE NOT NULL,

    -- Processing metadata
    parsed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_direction
        CHECK (direction IN ('in', 'out')),

    CONSTRAINT chk_type
        CHECK (type IN (
            'send', 'receive', 'payment',
            'withdrawal', 'deposit', 'airtime', 'fee'
        )),

    CONSTRAINT chk_hour
        CHECK (transacted_hour BETWEEN 0 AND 23),

    CONSTRAINT chk_day
        CHECK (transacted_day_of_week BETWEEN 0 AND 6),

    CONSTRAINT chk_amount
        CHECK (amount > 0),

    CONSTRAINT chk_service_charge
        CHECK (service_charge >= 0)
);

-- Indexes
CREATE INDEX idx_transactions_user_id
    ON transactions(user_id);

CREATE INDEX idx_transactions_phone_number_id
    ON transactions(phone_number_id);

CREATE INDEX idx_transactions_transacted_at
    ON transactions(transacted_at DESC);

CREATE INDEX idx_transactions_transacted_date
    ON transactions(transacted_date);

CREATE INDEX idx_transactions_category_id
    ON transactions(category_id);

CREATE INDEX idx_transactions_direction
    ON transactions(direction);

CREATE INDEX idx_transactions_type
    ON transactions(type);

CREATE INDEX idx_transactions_hour
    ON transactions(transacted_hour);

CREATE INDEX idx_transactions_counterparty_hash
    ON transactions(counterparty_phone_hash)
    WHERE counterparty_phone_hash IS NOT NULL;

CREATE INDEX idx_transactions_is_deleted
    ON transactions(is_deleted)
    WHERE is_deleted = FALSE;

-- Compound indexes for most common query patterns
CREATE INDEX idx_transactions_number_date
    ON transactions(phone_number_id, transacted_date DESC);

CREATE INDEX idx_transactions_user_date
    ON transactions(user_id, transacted_date DESC);