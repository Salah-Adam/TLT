-- Phase 6: expand the system category seed from 10 to 24.
INSERT INTO categories (name_en, name_so, icon, color, is_system) VALUES
('Health',          'Caafimaad',            'health',        '#EF4444', TRUE),
('Education',       'Waxbarasho',           'school',        '#3B82F6', TRUE),
('Shopping',        'Wax-iibsi',            'shopping',      '#8B5CF6', TRUE),
('Remittance',      'Xawaalad',             'transfer',      '#0EA5E9', TRUE),
('Zakat & Sadaqa',  'Zakada iyo Sadaqada',  'donate',        '#14B8A6', TRUE),
('Loan / Debt',     'Deyn',                 'loan',          '#F97316', TRUE),
('Savings',         'Kayd',                 'savings',       '#22C55E', TRUE),
('Gifts',           'Hadiyado',             'gift',          '#EC4899', TRUE),
('Livestock',       'Xoolaha',              'livestock',     '#A16207', TRUE),
('Construction',    'Dhismaha',             'construction',  '#6B7280', TRUE),
('Travel',          'Safar',                'travel',        '#06B6D4', TRUE),
('Entertainment',   'Madadaalo',            'entertainment', '#D946EF', TRUE),
('Internet',         'Internet',              'Internet',       '#007fd3', TRUE),
('Fuel',            'Shidaal',              'fuel',          '#B45309', TRUE);