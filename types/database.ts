export type UserRole = 'player' | 'mentor' | 'coach' | 'admin' | 'school'

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  profile_photo_url: string | null
  role: UserRole
  google_calendar_id: string | null
  google_calendar_access_token: string | null
  google_calendar_refresh_token: string | null
  google_calendar_connected: boolean | null
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  coach_id: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  player_id: string
  player_number: string | null
  invited_by: string | null
  invited_at: string
  joined_at: string | null
}

export interface Video {
  id: string
  player_id: string
  title: string
  description: string | null
  file_path: string | null // Can be null for URL-based submissions
  video_url: string | null // New: URL-based video submission
  player_numbers: string | null // New: Player number(s)
  file_size: number | null
  mime_type: string | null
  status: 'pending' | 'processing' | 'ready'
  submitted_by: string | null // Coach who submitted on behalf of player
  team_id: string | null
  created_at: string
  updated_at: string
}

export interface EducationVideo {
  id: string
  title: string
  video_url: string
  position: string | null
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProCalendlyLink {
  id: string
  pro_id: string
  calendly_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  tier: 'education_only' | 'full_access'
  status: 'active' | 'cancelled' | 'expired'
  created_at: string
  updated_at: string
}

export interface AvailabilitySlot {
  id: string
  mentor_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  is_recurring: boolean
  recurring_pattern: string | null
  recurring_end_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BookedSession {
  id: string
  availability_slot_id: string | null // Can be null if using Google Calendar
  mentor_id: string
  user_id: string
  google_event_id: string | null // Reference to Google Calendar event
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded'
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  payment_intent_id: string | null
  meeting_link: string | null
  notes: string | null
  created_at: string
  updated_at: string
  mentor?: Profile
  user?: Profile
}

export type FeedbackStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'paid'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface FeedbackSubmission {
  id: string
  video_id: string
  player_id: string
  mentor_id: string | null
  pro_id: string | null // New: Pro providing feedback (Marvel, etc.)
  status: FeedbackStatus
  payment_status: PaymentStatus
  payment_intent_id: string | null
  feedback_text: string | null
  rating: number | null
  mentor_notes: string | null
  player_notes: string | null // New: What coach asked pro to review
  feedback_video_url: string | null // New: Pro's feedback video URL
  email_draft_id: string | null // New: Email draft ID for pro workflow
  created_at: string
  updated_at: string
  completed_at: string | null
  videos?: Video
}

export interface Payment {
  id: string
  submission_id: string
  player_id: string
  amount: number
  currency: string
  stripe_payment_intent_id: string | null
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
  created_at: string
  updated_at: string
}

export interface SessionCredit {
  id: string
  user_id: string
  source_session_id: string | null
  reason: string
  used: boolean
  used_for_session_id: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}
