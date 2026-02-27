# Football Feedback App MVP

A platform where high school football players can submit videos for professional athlete feedback. Each feedback submission costs $50.

## Features

- **Player Dashboard**: 
  - Sign up and authenticate
  - Upload game footage videos
  - Request feedback on videos ($50 per submission)
  - View feedback and manage submissions
  - Track payment status

- **Mentor Dashboard**: 
  - Review incoming video submissions
  - Provide detailed feedback with ratings
  - Track submission status
  - Internal mentor notes

- **Payment Integration**: 
  - Stripe integration for $50 per feedback submission
  - Secure payment processing
  - Payment status tracking

- **Video Upload**: 
  - Secure video file upload to Supabase Storage
  - Support for multiple video formats
  - File size validation (max 100MB)

## Tech Stack

- **Next.js 14** (App Router) - React framework
- **TypeScript** - Type safety
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Storage for video files
  - Row Level Security (RLS)
- **Stripe** - Payment processing
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Stripe account (for payments)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `supabase/schema.sql`
3. Go to **Storage** and create a new bucket named `videos`:
   - Make it **public** or configure RLS policies for access
   - Enable file size limits (100MB recommended)

4. Get your Supabase credentials:
   - Project URL
   - Anon (public) key
   - Service role key (for admin operations)

### 3. Set up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the dashboard:
   - Publishable key (starts with `pk_`)
   - Secret key (starts with `sk_`)

3. Set up webhook endpoint:
   - Go to **Developers > Webhooks**
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   - Copy the webhook signing secret

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Database Schema

In Supabase SQL Editor, run the contents of `supabase/schema.sql` to create:
- Tables: `profiles`, `videos`, `feedback_submissions`, `payments`
- Row Level Security policies
- Triggers and functions
- Indexes for performance

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Schema

### Tables

- **profiles**: User profiles (extends Supabase auth.users)
  - `id` (UUID, references auth.users)
  - `email`
  - `full_name`
  - `role` ('player' or 'mentor')
  - Timestamps

- **videos**: Player video uploads
  - `id` (UUID)
  - `player_id` (references profiles)
  - `title`, `description`
  - `file_path` (Supabase Storage URL)
  - `file_size`, `mime_type`
  - `status` ('pending', 'processing', 'ready')

- **feedback_submissions**: Feedback requests
  - `id` (UUID)
  - `video_id`, `player_id`, `mentor_id`
  - `status` ('pending', 'assigned', 'in_progress', 'completed', 'paid')
  - `payment_status` ('pending', 'processing', 'completed', 'failed')
  - `payment_intent_id` (Stripe)
  - `feedback_text`, `rating`, `mentor_notes`
  - Timestamps

- **payments**: Payment records
  - `id` (UUID)
  - `submission_id`, `player_id`
  - `amount` (in cents, 5000 = $50.00)
  - `stripe_payment_intent_id`
  - `status` ('pending', 'processing', 'succeeded', 'failed', 'refunded')

### Row Level Security (RLS)

- Players can only view/edit their own videos and submissions
- Mentors can view all videos and submissions
- Secure data access based on user roles

## Project Structure

```
football-feedback-app/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── submissions/     # Submission endpoints
│   │   └── webhooks/        # Stripe webhooks
│   ├── dashboard/           # Dashboard page
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   └── page.tsx             # Home page
├── components/              # React components
│   ├── dashboard/           # Dashboard components
│   ├── feedback/            # Feedback components
│   ├── layout/              # Layout components
│   ├── ui/                  # UI components
│   └── video/               # Video components
├── lib/                     # Utility libraries
│   └── supabase/            # Supabase clients
├── supabase/                # Database schema
│   └── schema.sql           # SQL schema
├── types/                   # TypeScript types
│   └── database.ts          # Database types
└── middleware.ts            # Next.js middleware
```

## Usage

### For Players

1. **Sign Up**: Create an account and select "Player" role
2. **Upload Video**: Upload your game footage with title and description
3. **Request Feedback**: Click "Request Feedback ($50)" on any video
4. **Complete Payment**: Complete payment via Stripe Checkout
5. **Receive Feedback**: Wait for mentor to provide feedback, then view it in your dashboard

### For Mentors

1. **Sign Up**: Create an account and select "Mentor/Professional Athlete" role
2. **View Submissions**: See all pending feedback requests in your dashboard
3. **Review Videos**: Click on a submission to watch the video
4. **Provide Feedback**: 
   - Give a rating (1-5 stars)
   - Write detailed feedback text
   - Add private mentor notes
5. **Submit**: Mark feedback as completed

## Development

### Build for Production

```bash
npm run build
npm start
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy to Vercel (Recommended):**
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Add environment variables in Vercel dashboard
4. Deploy! Your app will be live in ~2 minutes

### Environment Variables for Production

Update `NEXT_PUBLIC_APP_URL` to your production domain:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Supabase Storage Configuration

Ensure your `videos` bucket has proper policies:

- **Public Access**: For public buckets, videos will be accessible via public URLs
- **RLS Policies**: For private buckets, configure storage policies to allow access based on user roles

Example storage policy (for private bucket):

```sql
-- Allow players to upload their own videos
CREATE POLICY "Players can upload own videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow mentors to view all videos
CREATE POLICY "Mentors can view all videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'videos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'mentor'
  )
);
```

## Future Enhancements

- Video playback within the app
- Email notifications for feedback
- Video annotations and timestamps
- Multiple mentors per submission
- Subscription plans
- Admin dashboard
- Analytics and reporting

## License

MIT

## Support

For issues or questions, please open an issue on the repository.
