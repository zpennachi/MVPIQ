-- MVP-IQ Schema Migration
-- Run this AFTER the existing schema.sql to add new features

-- Add coach role to profiles
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('player', 'mentor', 'coach', 'admin'));

-- Teams/Rosters table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members (players on rosters)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  player_number TEXT,
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(team_id, player_id)
);

-- Update videos table to support URL-based submissions
ALTER TABLE videos 
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS player_numbers TEXT,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Update feedback_submissions to support email workflow
ALTER TABLE feedback_submissions
  ADD COLUMN IF NOT EXISTS player_notes TEXT,
  ADD COLUMN IF NOT EXISTS feedback_video_url TEXT,
  ADD COLUMN IF NOT EXISTS email_draft_id TEXT,
  ADD COLUMN IF NOT EXISTS pro_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Education videos table
CREATE TABLE IF NOT EXISTS education_videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  position TEXT,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('education_only', 'full_access')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendly links for pros
CREATE TABLE IF NOT EXISTS pro_calendly_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pro_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  calendly_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_player_id ON team_members(player_id);
CREATE INDEX IF NOT EXISTS idx_videos_team_id ON videos(team_id);
CREATE INDEX IF NOT EXISTS idx_videos_submitted_by ON videos(submitted_by);
CREATE INDEX IF NOT EXISTS idx_education_videos_position ON education_videos(position);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_calendly_pro_id ON pro_calendly_links(pro_id);

-- RLS Policies for new tables

-- Teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own teams"
  ON teams FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin')
    )
  );

CREATE POLICY "Coaches can update own teams"
  ON teams FOR UPDATE
  USING (auth.uid() = coach_id);

-- Team members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own team memberships"
  ON team_members FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Coaches can view team members"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id AND teams.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can add players to teams"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_id AND teams.coach_id = auth.uid()
    )
  );

-- Education videos
ALTER TABLE education_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view education videos"
  ON education_videos FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage education videos"
  ON education_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Pro Calendly links
ALTER TABLE pro_calendly_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pros can manage own calendly links"
  ON pro_calendly_links FOR ALL
  USING (auth.uid() = pro_id);

CREATE POLICY "Coaches can view pro calendly links"
  ON pro_calendly_links FOR SELECT
  USING (is_active = true);

-- Update existing policies to support coaches
CREATE POLICY "Coaches can view all videos"
  ON videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin')
    ) OR
    auth.uid() = player_id OR
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.player_id = videos.player_id AND t.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view team submissions"
  ON feedback_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN team_members tm ON tm.player_id = v.player_id
      JOIN teams t ON t.id = tm.team_id
      WHERE v.id = feedback_submissions.video_id AND t.coach_id = auth.uid()
    )
  );
