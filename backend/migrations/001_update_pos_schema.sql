-- Migration: Update Sales Schema for POS Requirements

BEGIN;

-- 1. Update Sales Table
ALTER TABLE sales 
  DROP COLUMN IF EXISTS payment_method,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed', -- pending, completed, cancelled, refunded
  ADD COLUMN IF NOT EXISTS tips_total NUMERIC(10, 2) DEFAULT 0.00;

-- 2. Update Sale Items Table
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id),
  ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255), -- Snapshot for history
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id),
  ALTER COLUMN product_id DROP NOT NULL; -- Allow selling services without product_id

-- 3. Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method VARCHAR(50) NOT NULL, -- cash, card, loyalty, gift-card
  amount NUMERIC(10, 2) NOT NULL,
  reference VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_staff_id ON sale_items(staff_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_service_id ON sale_items(service_id);

COMMIT;
