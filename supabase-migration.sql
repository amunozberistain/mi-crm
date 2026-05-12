-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → project → SQL Editor)
-- Adds the notes column to deals and contacts tables

ALTER TABLE deals    ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;
