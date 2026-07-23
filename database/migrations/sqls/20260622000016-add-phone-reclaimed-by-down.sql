-- sqls/20260622000016-add-phone-reclaimed-by-down.sql
ALTER TABLE phone_numbers DROP COLUMN IF EXISTS reclaimed_by;