-- Sync Homepage Content to 4-Step Structure
-- Run this in your Supabase SQL Editor to update the live site

-- 1. Update the 'platform' section (Unlock Your Full Potential)
UPDATE homepage_sections
SET content = '{
  "screenshots": [
    {
      "step": 1,
      "title": "VIDEO SUBMISSION",
      "description": "Upload your game footage directly through our platform. Simply drag and drop your video, add details about what you''d like reviewed, and submit for professional analysis.",
      "mockup": {
        "form_title": "Submit a New Video",
        "user_detail": "#23 • Lincoln High School",
        "user_name": "Welcome back, John!",
        "video_url": "https://www.hudl.com/video/3/12345/abc..."
      }
    },
    {
      "step": 2,
      "title": "PROFESSIONAL ANALYSIS",
      "description": "Our experts conduct a thorough analysis of your video, focusing on technical skills, tactical awareness, and physical conditioning to provide a well-rounded assessment of your performance and potential.",
      "mockup": {
        "mentor_name": "Marvel Smith",
        "mentor_role": "Professional Mentor",
        "list_title": "New Submissions"
      }
    },
    {
      "step": 3,
      "title": "WRITTEN & VIDEO FEEDBACK",
      "description": "Receive detailed written feedback and video analysis from your mentor, with specific timestamps, annotations, and actionable recommendations for improvement.",
      "mockup": {
        "feedback_title": "Your Feedback",
        "mentor_name": "Marvel Smith",
        "mentor_role": "Former NFL Offensive Lineman",
        "feedback_notes": "Great improvement on your footwork! Your stance is much more balanced now. I noticed at the 2:15 mark your hip rotation opens up too early on the pass set..."
      }
    },
    {
      "step": 4,
      "title": "PERSONALIZED CONSULTATION",
      "description": "Book a one-on-one 15-minute session with your mentor to discuss your progress, ask questions, and receive personalized coaching tailored to your development goals.",
      "mockup": {
        "list_title": "My Appointments",
        "mentor_name": "Marvel Smith",
        "session_date": "Friday, March 15, 2024",
        "session_time": "3:00 PM - 3:15 PM",
        "session_type": "1-on-1 Session"
      }
    }
  ]
}'::jsonb
WHERE section_key = 'platform';

-- 2. Update the 'mentorship' section (How to Get Started)
UPDATE homepage_sections
SET 
  description = 'Follow these four easy steps to begin your journey toward elevating your game:',
  content = '{
  "steps": [
    {
      "number": 1,
      "title": "Sign Up & Connect with Marvel Smith:",
      "description": "Create an account and connect with 2x Super Bowl Champion Marvel Smith to find the perfect mentor for your position."
    },
    {
      "number": 2,
      "title": "Submit Your Game Film:",
      "description": "Upload your best clips (max 2 minutes) showing clear angles of your play, preferably from the end zone or above."
    },
    {
      "number": 3,
      "title": "Receive Professional Feedback:",
      "description": "Get detailed written notes and a video breakdown from your mentor highlighting strengths and areas for growth."
    },
    {
      "number": 4,
      "title": "Book a Personalized Consultation:",
      "description": "Take your game to the next level with a live 15-minute 1-on-1 session to discuss your progress and strategy."
    }
  ]
}'::jsonb
WHERE section_key = 'mentorship';
