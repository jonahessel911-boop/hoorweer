-- Fix lead status default after status rename (aangemaakt -> nieuw)
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'nieuw';

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'nieuw', 'contact_poging', 'afgeboekt_geen_contact',
  'test_verzonden', 'test_gestart', 'test_afgerond'
));

UPDATE leads SET status = 'nieuw' WHERE status = 'aangemaakt';
UPDATE leads SET status = 'test_verzonden' WHERE status = 'verzonden';
