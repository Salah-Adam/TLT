-- Who reclaimed this number away from the previous owner.
-- Set on the previous owner's (now-inactive) row at reclaim time.
ALTER TABLE phone_numbers ADD COLUMN reclaimed_by UUID REFERENCES users(id);