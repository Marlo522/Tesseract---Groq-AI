-- ============================================
-- Scholarship System: Database Schema Update
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop old applications table (if exists) and recreate with proper schema
DROP TABLE IF EXISTS applications CASCADE;

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Three required documents (mother, father, report card)
  mother_certificate_url TEXT NOT NULL,
  father_certificate_url TEXT NOT NULL,
  report_card_url TEXT NOT NULL,
  
  -- Parent income values
  mother_income DECIMAL(10, 2),
  father_income DECIMAL(10, 2),
  
  -- AI processing results
  extracted_text TEXT,
  evaluation_result JSONB,
  qualified BOOLEAN DEFAULT false,
  confidence_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_qualified ON applications(qualified);

-- Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own applications
CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Verify the schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'applications'
ORDER BY ordinal_position;
