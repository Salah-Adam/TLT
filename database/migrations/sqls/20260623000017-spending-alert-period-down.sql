-- sqls/20260623000017-spending-alert-period-down.sql
-- reverse: unique constraint back to 3 columns
ALTER TABLE spending_alerts DROP CONSTRAINT IF EXISTS uq_spending_alert_per_category;
ALTER TABLE spending_alerts ADD CONSTRAINT uq_spending_alert_per_category
    UNIQUE (user_id, phone_number_id, category_id);

-- reverse: rename back to monthly_limit
ALTER TABLE spending_alerts RENAME COLUMN limit_amount TO monthly_limit;

-- reverse: drop period + its check
ALTER TABLE spending_alerts DROP CONSTRAINT IF EXISTS chk_alert_period;
ALTER TABLE spending_alerts DROP COLUMN IF EXISTS period;