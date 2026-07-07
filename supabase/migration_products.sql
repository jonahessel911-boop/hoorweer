-- Products catalog + order product snapshots
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

ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_model TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_beschrijving TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_image_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_kenmerken TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS listprijs DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS korting_bedrag DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS signature_image TEXT;

UPDATE orders SET listprijs = prijs WHERE listprijs IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on products" ON products;
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);

INSERT INTO products (id, naam, model, beschrijving, listprijs, kenmerken, actief)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'HearDirect Hoortoestel Set',
  'HD-1',
  'Volledig in het oor hoortoestel met oplaadcase. Geschikt bij licht tot matig gehoorverlies.',
  349.00,
  E'HearDirect hoortoestel-set incl. oplaadcase\nNederlandse handleiding\n2 jaar garantie\n30 dagen op proef',
  true
) ON CONFLICT (id) DO NOTHING;
