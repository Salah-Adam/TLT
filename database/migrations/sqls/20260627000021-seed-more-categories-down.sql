-- sqls/20260627000021-seed-more-categories-down.sql
DELETE FROM categories
WHERE is_system = TRUE
  AND name_en IN (
    'Health', 'Education', 'Shopping', 'Remittance', 'Zakat & Sadaqa',
    'Loan / Debt', 'Savings', 'Gifts', 'Livestock', 'Construction',
    'Travel', 'Entertainment', 'Internet', 'Fuel'
  );