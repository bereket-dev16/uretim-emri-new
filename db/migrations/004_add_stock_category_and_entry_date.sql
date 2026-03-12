ALTER TABLE stocks
ALTER COLUMN product_type TYPE VARCHAR(32);

ALTER TABLE stocks
DROP CONSTRAINT IF EXISTS stocks_product_type_check;

UPDATE stocks
SET product_type = 'blister_folyo'
WHERE product_type = 'folyo';

ALTER TABLE stocks
ADD CONSTRAINT stocks_product_type_check
CHECK (
  product_type IN (
    'kutu',
    'blister_folyo',
    'sase_folyo',
    'prospektus',
    'sise',
    'etiket',
    'kapak',
    'sleeve'
  )
);

ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS product_category VARCHAR(16);

ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS stock_entry_date DATE;

UPDATE stocks
SET product_category = 'hammadde'
WHERE product_category IS NULL;

UPDATE stocks
SET stock_entry_date = created_at::date
WHERE stock_entry_date IS NULL;

ALTER TABLE stocks
ALTER COLUMN product_category SET NOT NULL;

ALTER TABLE stocks
ALTER COLUMN stock_entry_date SET NOT NULL;

ALTER TABLE stocks
ALTER COLUMN stock_entry_date SET DEFAULT CURRENT_DATE;

ALTER TABLE stocks
DROP CONSTRAINT IF EXISTS stocks_product_category_check;

ALTER TABLE stocks
ADD CONSTRAINT stocks_product_category_check
CHECK (product_category IN ('sarf', 'hammadde'));

CREATE INDEX IF NOT EXISTS idx_stocks_product_type ON stocks(product_type);
CREATE INDEX IF NOT EXISTS idx_stocks_product_category ON stocks(product_category);
CREATE INDEX IF NOT EXISTS idx_stocks_stock_entry_date ON stocks(stock_entry_date);
