-- Homepage Editor Schema
-- Allows admins to manage homepage content and section order

CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  section_key TEXT UNIQUE NOT NULL, -- e.g., 'hero', 'pros', 'platform', etc.
  section_type TEXT NOT NULL, -- 'hero', 'content', 'steps', 'screenshot', etc.
  title TEXT,
  subtitle TEXT,
  description TEXT,
  button_text TEXT,
  button_link TEXT,
  content JSONB, -- Flexible JSON for section-specific content
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_order ON homepage_sections(display_order);
CREATE INDEX IF NOT EXISTS idx_homepage_sections_active ON homepage_sections(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;

-- Only admins can modify
CREATE POLICY "Admins can manage homepage sections"
  ON homepage_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Everyone can read active sections
CREATE POLICY "Everyone can view active homepage sections"
  ON homepage_sections FOR SELECT
  USING (is_active = true);

-- Insert default sections based on current homepage
INSERT INTO homepage_sections (section_key, section_type, title, subtitle, description, button_text, button_link, display_order, content) VALUES
  ('hero', 'hero', 'EMPOWERING THE NEXT GENERATION OF SPORTS TALENT.', NULL, 'Led by former professional athletes, we deliver advanced video analysis and tailored tools to elevate sports performance, helping players and coaches refine their skills and strategies.', 'LEARN MORE', '/register', 1, '{}'::jsonb),
  ('pros', 'content', 'LEARN FROM THE PROS', 'Our analysis is driven by former NFL players, bringing their unparalleled expertise and experience to elevate your game.', NULL, NULL, NULL, 2, '{"mentor_name": "MARVEL SMITH", "mentor_initials": "MS", "achievements": ["PRO BOWL 2004", "FIRST-TEAM ALL-PAC-10", "FIRST-TEAM ALL-AMERICAN", "2x SUPER BOWL CHAMPION"], "quote": "SMITH WAS CONSIDERED BY MANY TO BE ONE OF THE MOST IMPORTANT PLAYERS ON THE STEELERS'' OFFENSIVE LINE."}'::jsonb),
  ('platform', 'screenshots', 'UNLOCK YOUR FULL POTENTIAL: HOW OUR PLATFORM ELEVATES YOUR GAME', NULL, NULL, NULL, NULL, 3, '{"screenshots": [{"step": 1, "title": "VIDEO SUBMISSION", "description": "Upload your game footage directly through our platform. Simply drag and drop your video, add details about what you''d like reviewed, and submit for professional analysis."}, {"step": 2, "title": "EVALUATION PROCESS", "description": "Your video is assigned to a professional mentor who conducts a comprehensive analysis, examining technique, positioning, decision-making, and overall performance."}, {"step": 3, "title": "TALENT IDENTIFICATION", "description": "Our analysis identifies your key strengths, areas for improvement, and provides a comprehensive assessment of your current skill level and potential."}, {"step": 4, "title": "WRITTEN & VIDEO FEEDBACK", "description": "Receive detailed written feedback and video analysis from your mentor, with specific timestamps, annotations, and actionable recommendations for improvement."}, {"step": 5, "title": "PERSONALIZED CONSULTATION", "description": "Book one-on-one sessions with your mentor to discuss your progress, ask questions, and receive personalized coaching tailored to your development goals."}]}'::jsonb),
  ('mentorship', 'steps', 'MVP MENTORSHIP', 'How to get started', 'Follow these three easy steps to begin your journey toward elevating your game:', 'SIGN UP TODAY', '/register', 4, '{"steps": [{"number": 1, "title": "Fill Out the Interest Form:", "description": "Start by completing our online interest form to share your goals and needs."}, {"number": 2, "title": "Get Matched with a Professional Athlete:", "description": "We''ll pair you with a former professional athlete who best fits your development objectives."}, {"number": 3, "title": "Choose Your Plan and Begin Analysis:", "description": "Select the plan that suits you, and dive into your personalized analysis to start improving your game."}]}'::jsonb),
  ('insights', 'content', 'ATHLETE INSIGHTS: STORIES AND LESSONS FROM THE PROS', NULL, 'Explore our Media Archive to discover valuable insights and stories from seasoned athletes. Learn from their experiences, challenges, and triumphs as they share what it takes to grow and succeed in the world of sports. Whether you''re seeking inspiration or practical advice, our collection offers a wealth of knowledge to help you on your athletic journey.', 'EXPLORE MEDIA ARCHIVE', '/dashboard/education', 5, '{}'::jsonb)
ON CONFLICT (section_key) DO NOTHING;
