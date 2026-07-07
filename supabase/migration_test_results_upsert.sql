-- One result per step per lead (enables fast upsert during hoortest)
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_results_lead_step
  ON test_results(lead_id, stap_nummer);
