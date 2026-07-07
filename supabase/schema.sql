-- HearDirect database schema
-- Run this in your Supabase SQL editor

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  telefoon TEXT NOT NULL,
  email TEXT,
  test_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'nieuw'
    CHECK (status IN (
      'nieuw', 'contact_poging', 'afgeboekt_geen_contact',
      'test_verzonden', 'test_gestart', 'test_afgerond'
    )),
  contact_pogingen INTEGER NOT NULL DEFAULT 0
    CHECK (contact_pogingen >= 0 AND contact_pogingen <= 7),
  contact_uitkomst TEXT
    CHECK (contact_uitkomst IS NULL OR contact_uitkomst IN ('terugbellen', 'deal', 'geen_interesse')),
  laatste_belpoging TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migraties voor bestaande leads-tabellen (CREATE TABLE IF NOT EXISTS voegt geen kolommen toe)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_pogingen INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_uitkomst TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS laatste_belpoging TIMESTAMPTZ;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'nieuw', 'contact_poging', 'afgeboekt_geen_contact',
  'test_verzonden', 'test_gestart', 'test_afgerond'
));
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'nieuw';

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_contact_pogingen_check;
ALTER TABLE leads ADD CONSTRAINT leads_contact_pogingen_check
  CHECK (contact_pogingen >= 0 AND contact_pogingen <= 7);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_contact_uitkomst_check;
ALTER TABLE leads ADD CONSTRAINT leads_contact_uitkomst_check
  CHECK (contact_uitkomst IS NULL OR contact_uitkomst IN ('terugbellen', 'deal', 'geen_interesse'));

-- Call logs (belpogingen)
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  uitkomst TEXT NOT NULL CHECK (uitkomst IN (
    'geen_bereik', 'geen_gehoor', 'voicemail',
    'testlink_verstuurd', 'bel_later_terug', 'deal', 'geen_interesse'
  )),
  telt_mee BOOLEAN NOT NULL DEFAULT true,
  notitie TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Test results
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  stap_nummer INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('toon', 'spraak', 'vraag')),
  frequentie INTEGER,
  oor TEXT CHECK (oor IN ('links', 'rechts', 'beide')),
  antwoord TEXT NOT NULL CHECK (antwoord IN ('gehoord', 'niet_gehoord')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  model TEXT NOT NULL,
  beschrijving TEXT NOT NULL DEFAULT '',
  listprijs DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  kenmerken TEXT NOT NULL DEFAULT '',
  actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  productnaam TEXT NOT NULL DEFAULT 'HearDirect Hoortoestel Set',
  product_model TEXT,
  product_beschrijving TEXT,
  product_image_url TEXT,
  product_kenmerken TEXT,
  listprijs DECIMAL(10, 2),
  korting_bedrag DECIMAL(10, 2) NOT NULL DEFAULT 0,
  prijs DECIMAL(10, 2) NOT NULL,
  offerte_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'offerte_aangemaakt'
    CHECK (status IN (
      'offerte_aangemaakt', 'offerte_verzonden', 'ondertekend',
      'betaallink_verzonden', 'betaald'
    )),
  ondertekend_door TEXT,
  ondertekend_op TIMESTAMPTZ,
  signature_image TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'offerte'
    CHECK (delivery_status IN (
      'offerte', 'aangemaakt', 'in_progress', 'verzonden', 'aangekomen',
      'bedenktijd', 'netto_sale', 'cancelled'
    )),
  order_nummer INTEGER UNIQUE,
  land TEXT NOT NULL DEFAULT 'Nederland',
  postcode TEXT,
  huisnummer TEXT,
  huisnummer_toevoeging TEXT,
  straat TEXT,
  plaats TEXT,
  provincie TEXT,
  signed_offer_pdf TEXT,
  aangekomen_op TIMESTAMPTZ,
  bedenktijd_dagen INTEGER NOT NULL DEFAULT 30,
  netto_sale_op TIMESTAMPTZ,
  cancelled_op TIMESTAMPTZ,
  cancelled_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_test_token ON leads(test_token);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_test_results_lead_id ON test_results(lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_results_lead_step ON test_results(lead_id, stap_nummer);
CREATE INDEX IF NOT EXISTS idx_orders_offerte_token ON orders(offerte_token);
CREATE INDEX IF NOT EXISTS idx_orders_lead_id ON orders(lead_id);

-- Enable Realtime (veilig opnieuw uitvoeren — werkt op alle Postgres-versies)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['leads', 'orders', 'call_logs', 'test_results', 'products']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Row Level Security (permissive for anon key — tighten in production)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on leads" ON leads;
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on test_results" ON test_results;
CREATE POLICY "Allow all on test_results" ON test_results FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on orders" ON orders;
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on call_logs" ON call_logs;
CREATE POLICY "Allow all on call_logs" ON call_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on products" ON products;
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
