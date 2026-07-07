-- Migration: lead contact tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_pogingen INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_uitkomst TEXT;

-- Update status constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'nieuw', 'contact_poging', 'afgeboekt_geen_contact',
  'test_verzonden', 'test_gestart', 'test_afgerond',
  'aangemaakt', 'verzonden'
));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_contact_pogingen_check;
ALTER TABLE leads ADD CONSTRAINT leads_contact_pogingen_check
  CHECK (contact_pogingen >= 0 AND contact_pogingen <= 7);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_contact_uitkomst_check;
ALTER TABLE leads ADD CONSTRAINT leads_contact_uitkomst_check
  CHECK (contact_uitkomst IS NULL OR contact_uitkomst IN ('terugbellen', 'deal', 'geen_interesse'));

-- Migrate legacy statuses
UPDATE leads SET status = 'nieuw' WHERE status = 'aangemaakt';
UPDATE leads SET status = 'test_verzonden' WHERE status = 'verzonden';
