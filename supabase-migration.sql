-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → project → SQL Editor)

-- Notes fields
ALTER TABLE deals    ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;

-- Store the structured content used to generate each PDF
-- so it can be reloaded for editing without re-running AI extraction
ALTER TABLE deals ADD COLUMN IF NOT EXISTS budget_draft    JSONB;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS proposal_content JSONB;
