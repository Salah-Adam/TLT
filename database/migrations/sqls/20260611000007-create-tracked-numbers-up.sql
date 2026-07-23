-- Contact groups (Wife, Son, Supplier Ahmed)
CREATE TABLE tracked_contacts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    phone_number_id     UUID REFERENCES phone_numbers(id),
    label               VARCHAR(100) NOT NULL,
    tracking_direction  VARCHAR(10) NOT NULL DEFAULT 'both',

    -- Running totals across all numbers in this contact
    total_sent          NUMERIC(15,4) NOT NULL DEFAULT 0,
    total_received      NUMERIC(15,4) NOT NULL DEFAULT 0,
    transaction_count   INTEGER NOT NULL DEFAULT 0,
    last_transaction_at TIMESTAMPTZ,

    -- Status
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT chk_tracking_direction
        CHECK (tracking_direction IN ('sent', 'received', 'both')),

    CONSTRAINT chk_total_sent
        CHECK (total_sent >= 0),

    CONSTRAINT chk_total_received
        CHECK (total_received >= 0),

    CONSTRAINT chk_transaction_count
        CHECK (transaction_count >= 0)
);



-- Individual numbers belonging to a contact
CREATE TABLE tracked_contact_numbers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id          UUID NOT NULL REFERENCES tracked_contacts(id),
    user_id             UUID NOT NULL REFERENCES users(id),

    -- Encrypted number + hash for matching
    tracked_number_enc  TEXT NOT NULL,
    tracked_number_hash VARCHAR(255) NOT NULL,

    -- Per-number running totals
    total_sent          NUMERIC(15,4) NOT NULL DEFAULT 0,
    total_received      NUMERIC(15,4) NOT NULL DEFAULT 0,
    transaction_count   INTEGER NOT NULL DEFAULT 0,
    last_transaction_at TIMESTAMPTZ,

    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_total_sent
        CHECK (total_sent >= 0),

    CONSTRAINT chk_total_received
        CHECK (total_received >= 0),

    CONSTRAINT uq_number_per_user
        UNIQUE (user_id, tracked_number_hash)
);

-- Indexes
CREATE INDEX idx_tracked_contacts_user_id
    ON tracked_contacts(user_id);

CREATE INDEX idx_tracked_contacts_phone_number_id
    ON tracked_contacts(phone_number_id)
    WHERE phone_number_id IS NOT NULL;

CREATE INDEX idx_tracked_contact_numbers_contact_id
    ON tracked_contact_numbers(contact_id);

CREATE INDEX idx_tracked_contact_numbers_hash
    ON tracked_contact_numbers(tracked_number_hash);

CREATE INDEX idx_tracked_contact_numbers_user_id
    ON tracked_contact_numbers(user_id);
