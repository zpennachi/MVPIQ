-- Add server-side tracking for viewed feedback
-- This ensures feedback marked as "viewed" persists across devices/browsers

-- Create table to track viewed feedback
CREATE TABLE IF NOT EXISTS viewed_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  submission_id UUID REFERENCES feedback_submissions(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, submission_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_viewed_feedback_user_submission ON viewed_feedback(user_id, submission_id);
CREATE INDEX IF NOT EXISTS idx_viewed_feedback_submission ON viewed_feedback(submission_id);

-- Enable RLS
ALTER TABLE viewed_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only view their own viewed feedback records
CREATE POLICY "Users can view own viewed feedback"
  ON viewed_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own viewed feedback records
CREATE POLICY "Users can insert own viewed feedback"
  ON viewed_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own viewed feedback records (for cleanup if needed)
CREATE POLICY "Users can delete own viewed feedback"
  ON viewed_feedback FOR DELETE
  USING (auth.uid() = user_id);
