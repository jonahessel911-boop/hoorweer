-- Test lead voor lokale ontwikkeling en demo
INSERT INTO leads (
  id,
  naam,
  telefoon,
  email,
  test_token,
  status,
  contact_pogingen,
  contact_uitkomst,
  created_at
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Test Klant',
  '06-00000001',
  'test@hear-direct.nl',
  'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  'nieuw',
  0,
  NULL,
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO leads (
  id,
  naam,
  telefoon,
  email,
  test_token,
  status,
  contact_pogingen,
  contact_uitkomst,
  created_at
)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Test Klant 2',
  '06-00000002',
  'test2@hear-direct.nl',
  'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  'nieuw',
  0,
  NULL,
  now()
)
ON CONFLICT (id) DO NOTHING;
