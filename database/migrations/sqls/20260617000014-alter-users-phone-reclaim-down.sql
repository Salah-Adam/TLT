-- sqls/20260617000014-alter-users-phone-reclaim-down.sql
-- reverse the notifications chk_type (back to the pre-015 list, no 'number_reclaimed')
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_type;
ALTER TABLE notifications ADD CONSTRAINT chk_type CHECK (type IN (
    'transaction_received', 'transaction_sent', 'spending_alert',
    'daily_summary', 'weekly_summary', 'monthly_summary',
    'report_ready', 'trial_ending', 'account'
));

-- reverse the phone_numbers additions
ALTER TABLE phone_numbers DROP COLUMN IF EXISTS reclaimed_at;
ALTER TABLE phone_numbers DROP COLUMN IF EXISTS previous_user_id;

-- reverse the users constraints + columns
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_age;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_sex;
ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_phone_number;
ALTER TABLE users DROP COLUMN IF EXISTS sex;
ALTER TABLE users DROP COLUMN IF EXISTS city;
ALTER TABLE users DROP COLUMN IF EXISTS age;
ALTER TABLE users DROP COLUMN IF EXISTS otp_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS otp_code;
ALTER TABLE users DROP COLUMN IF EXISTS phone_number;
ALTER TABLE users DROP COLUMN IF EXISTS full_name;

-- reverse the email change
ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_email;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

-- re-add the columns 015 dropped (original definitions)
ALTER TABLE users ADD COLUMN username     VARCHAR(50)  UNIQUE NOT NULL;
ALTER TABLE users ADD COLUMN is_verified  BOOLEAN      NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN account_type VARCHAR(20)  NOT NULL DEFAULT 'individual';