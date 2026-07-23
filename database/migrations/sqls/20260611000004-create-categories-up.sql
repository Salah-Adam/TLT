CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    name_en     VARCHAR(100) NOT NULL,
    name_so     VARCHAR(100) NOT NULL,
    icon        VARCHAR(50),
    color       VARCHAR(7),
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    CONSTRAINT chk_color_format
        CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX idx_categories_user_id
    ON categories(user_id)
    WHERE user_id IS NOT NULL;

-- Seed default system categories
INSERT INTO categories (name_en, name_so, icon, color, is_system) VALUES
('Food',            'Cunto',            'food',         '#FF6B35', TRUE),
('Transport',       'Gaadiid',          'transport',    '#4ECDC4', TRUE),
('Rent',            'Kiro',             'home',         '#45B7D1', TRUE),
('Family Support',  'Taageerada Qoyska','family',       '#96CEB4', TRUE),
('Business',        'Ganacsiga',        'business',     '#FFEAA7', TRUE),
('Airtime',         'Airtime',          'phone',        '#DDA0DD', TRUE),
('Utilities',       'Biyo-Korontada',   'utilities',    '#98D8C8', TRUE),
('Salary',          'Mushaharo',        'salary',       '#7EC8E3', TRUE),
('Freelance',       'Shaqo Xor',        'freelance',    '#B8B8FF', TRUE),
('Other',           'Kale',             'other',        '#D3D3D3', TRUE);