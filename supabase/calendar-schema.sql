-- Custom Calendar System for 1-on-1 Sessions
-- Run this to add calendar functionality

-- Availability slots table (mentors set their availability)
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mentor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern TEXT, -- 'daily', 'weekly', 'monthly'
  recurring_end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (end_time > start_time)
);

-- Booked sessions table
CREATE TABLE IF NOT EXISTS booked_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  availability_slot_id UUID REFERENCES availability_slots(id) ON DELETE CASCADE NOT NULL,
  mentor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_intent_id TEXT,
  meeting_link TEXT, -- Zoom, Google Meet, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_availability_slots_mentor_id ON availability_slots(mentor_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_start_time ON availability_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_availability_slots_active ON availability_slots(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_booked_sessions_mentor_id ON booked_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_booked_sessions_user_id ON booked_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_booked_sessions_start_time ON booked_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_booked_sessions_status ON booked_sessions(status);

-- RLS Policies

-- Availability slots
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage own availability"
  ON availability_slots FOR ALL
  USING (auth.uid() = mentor_id);

CREATE POLICY "Everyone can view active availability slots"
  ON availability_slots FOR SELECT
  USING (is_active = true AND start_time > NOW());

-- Booked sessions
ALTER TABLE booked_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booked sessions"
  ON booked_sessions FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = mentor_id);

CREATE POLICY "Users can create bookings"
  ON booked_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON booked_sessions FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = mentor_id);

-- Function to check if slot is available
CREATE OR REPLACE FUNCTION is_slot_available(
  p_slot_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE
) RETURNS BOOLEAN AS $$
DECLARE
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  conflicting_count INTEGER;
BEGIN
  -- Get slot times
  SELECT start_time, end_time INTO slot_start, slot_end
  FROM availability_slots
  WHERE id = p_slot_id AND is_active = true;

  IF slot_start IS NULL THEN
    RETURN false;
  END IF;

  -- Check if requested time is within slot
  IF p_start_time < slot_start OR p_end_time > slot_end THEN
    RETURN false;
  END IF;

  -- Check for conflicting bookings
  SELECT COUNT(*) INTO conflicting_count
  FROM booked_sessions
  WHERE availability_slot_id = p_slot_id
    AND status NOT IN ('cancelled', 'refunded')
    AND (
      (p_start_time >= start_time AND p_start_time < end_time)
      OR (p_end_time > start_time AND p_end_time <= end_time)
      OR (p_start_time <= start_time AND p_end_time >= end_time)
    );

  RETURN conflicting_count = 0;
END;
$$ LANGUAGE plpgsql;
