-- Run this SQL in your Supabase SQL Editor
-- This updates the applications table to support two document uploads

-- Add columns for two documents
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS income_certificate_url TEXT,
ADD COLUMN IF NOT EXISTS report_card_url TEXT;

-- Optional: Drop the old single document column if you want
-- ALTER TABLE applications DROP COLUMN IF EXISTS document_url;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applications'
ORDER BY ordinal_position;
