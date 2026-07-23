CREATE TABLE providers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) UNIQUE NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    company_name    VARCHAR(100) NOT NULL,
    country         VARCHAR(10) NOT NULL DEFAULT 'SO',
    sms_sender_id   VARCHAR(50),
    currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    parsing_config  JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO providers (code, display_name, company_name, sms_sender_id, parsing_config) VALUES
('evcplus', 'EVC Plus', 'Hormuud', '192', '{ "keywords_sent": ["uwareejisay", "sent", "u dirtey"], "keywords_received": ["heshay", "received"], "keywords_deposit": ["shubtey", "deposit"] }'),
('edahab', 'eDahab', 'Somtel', 'eDahab', '{ "keywords_sent": ["u warejisay", "sent", "u wareejisey"], "keywords_received": ["heshay", "received"] }' );
