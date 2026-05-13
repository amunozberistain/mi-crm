-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → project → SQL Editor)

-- Notes fields
ALTER TABLE deals    ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;

-- Store the structured content used to generate each PDF
-- so it can be reloaded for editing without re-running AI extraction
ALTER TABLE deals ADD COLUMN IF NOT EXISTS budget_draft    JSONB;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS proposal_content JSONB;

-- ─── Actividades / Calendario ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  color           TEXT NOT NULL DEFAULT '#4f46e5',
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  source          TEXT NOT NULL DEFAULT 'manual',
  google_event_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activities_user_start ON activities(user_id, start_at);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_own" ON activities
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Google OAuth tokens ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS google_tokens (
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ NOT NULL
);
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "google_tokens_own" ON google_tokens
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
