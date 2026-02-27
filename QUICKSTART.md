# Quick Start Guide

This guide will help you get the Football Feedback App running in minutes.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (takes 1-2 minutes)
3. Once created, go to **SQL Editor** and click "New Query"
4. Copy and paste the entire contents of `supabase/schema.sql` and run it
5. Go to **Storage** and:
   - Click "Create a new bucket"
   - Name it `videos`
   - Make it **Public** (or configure RLS policies for private access)
   - Set file size limit to 100MB
6. Get your credentials:
   - Go to **Settings > API**
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Step 3: Set Up Stripe (Optional for Testing)

1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your test keys from **Developers > API keys**:
   - Copy **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Copy **Secret key** → `STRIPE_SECRET_KEY`
3. For webhooks (needed for production):
   - Go to **Developers > Webhooks**
   - Click "Add endpoint"
   - URL: `https://your-domain.com/api/webhooks/stripe` (use ngrok for local testing)
   - Select events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   - Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

## Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 5: Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the App

### As a Player:

1. Click "Sign Up" and create an account
2. Select role: **Player**
3. Go to Dashboard
4. Upload a video (drag & drop or click to select)
5. Fill in title and description
6. Click "Request Feedback ($50)"
7. Complete payment in Stripe Checkout (use test card: 4242 4242 4242 4242)
8. Wait for feedback from a mentor

### As a Mentor:

1. Click "Sign Up" and create an account
2. Select role: **Mentor/Professional Athlete**
3. Go to Dashboard
4. View pending submissions
5. Click "Review & Provide Feedback"
6. Watch the video
7. Provide rating (1-5 stars) and detailed feedback
8. Click "Submit Feedback"

## Common Issues

### "Unauthorized" errors
- Make sure you're logged in
- Check that your Supabase keys are correct

### Video upload fails
- Verify Supabase Storage bucket is created and named `videos`
- Check bucket permissions (should be public for MVP)
- Ensure file size is under 100MB

### Payment doesn't work
- Use Stripe test mode keys (start with `pk_test_` and `sk_test_`)
- Use test card: 4242 4242 4242 4242, any future expiry date, any CVC
- Check Stripe dashboard for payment events

### Database errors
- Make sure you ran the SQL schema in Supabase SQL Editor
- Verify tables exist: `profiles`, `videos`, `feedback_submissions`, `payments`

## Next Steps

- Customize styling in `app/globals.css`
- Add more features (email notifications, video annotations, etc.)
- Deploy to Vercel, Netlify, or your preferred hosting
- Set up production Stripe keys
- Configure custom domain

## Support

For issues or questions:
1. Check the main README.md for detailed documentation
2. Review Supabase and Stripe documentation
3. Check browser console for errors
