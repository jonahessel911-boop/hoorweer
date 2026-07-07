-- Migration: call logs + daglimiet belpogingen
ALTER TABLE leads ADD COLUMN IF NOT EXISTS laatste_belpoging TIMESTAMPTZ;

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

CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON call_logs(lead_id);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on call_logs" ON call_logs FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
