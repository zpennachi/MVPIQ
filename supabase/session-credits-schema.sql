-- Session Credits System
-- Allows users to reschedule cancelled sessions without payment

-- Create session_credits table
CREATE TABLE IF NOT EXISTS session_credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  source_session_id UUID REFERENCES booked_sessions(id) ON DELETE SET NULL,
  reason TEXT DEFAULT 'mentor_cancellation', -- 'mentor_cancellation', 'admin_grant', etc.
  used BOOLEAN DEFAULT false,
  used_for_session_id UUID REFERENCES booked_sessions(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional: credits can expire
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_credits_user_id ON session_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_session_credits_used ON session_credits(used) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_session_credits_user_unused ON session_credits(user_id, used) WHERE used = false;

-- RLS Policies
ALTER TABLE session_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON session_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own unused credits"
  ON session_credits FOR UPDATE
  USING (auth.uid() = user_id AND used = false);

-- Function to get available credit count for a user
CREATE OR REPLACE FUNCTION get_available_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credit_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO credit_count
  FROM session_credits
  WHERE user_id = p_user_id
    AND used = false
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN COALESCE(credit_count, 0);
END;
$$;
