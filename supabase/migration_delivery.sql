-- Migration: delivery status fields for orders
-- Run after initial schema if upgrading

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'aangemaakt'
  CHECK (delivery_status IN (
    'aangemaakt', 'in_progress', 'verzonden', 'aangekomen',
    'bedenktijd', 'netto_sale', 'cancelled'
  ));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS aangekomen_op TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bedenktijd_dagen INTEGER NOT NULL DEFAULT 30;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS netto_sale_op TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_op TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_from TEXT;
