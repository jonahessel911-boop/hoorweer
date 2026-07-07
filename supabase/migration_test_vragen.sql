-- Vragen toevoegen aan hoortest (type 'vraag')
ALTER TABLE test_results DROP CONSTRAINT IF EXISTS test_results_type_check;
ALTER TABLE test_results ADD CONSTRAINT test_results_type_check
  CHECK (type IN ('toon', 'spraak', 'vraag'));
