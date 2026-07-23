-- Weekly + monthly spending alerts.
ALTER TABLE spending_alerts ADD COLUMN IF NOT EXISTS period VARCHAR(10) NOT NULL DEFAULT 'monthly';
ALTER TABLE spending_alerts ADD CONSTRAINT chk_alert_period CHECK (period IN ('weekly','monthly'));

-- The limit is no longer monthly-specific.
ALTER TABLE spending_alerts RENAME COLUMN monthly_limit TO limit_amount;

-- One alert per (category, phone scope, period).
ALTER TABLE spending_alerts DROP CONSTRAINT IF EXISTS uq_spending_alert_per_category;
ALTER TABLE spending_alerts ADD CONSTRAINT uq_spending_alert_per_category
    UNIQUE (user_id, phone_number_id, category_id, period);