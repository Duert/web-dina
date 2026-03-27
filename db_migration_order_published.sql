ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS is_order_published BOOLEAN DEFAULT false;
