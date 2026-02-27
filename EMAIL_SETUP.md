# Email Setup Guide

Supabase doesn't have built-in transactional email service. You need to use a third-party service.

## Option 1: Resend (Recommended - Easiest)

Resend is the simplest option for sending transactional emails.

### Setup Steps:

1. **Sign up at [resend.com](https://resend.com)**
   - Free tier: 3,000 emails/month
   - Easy API integration

2. **Get your API Key**
   - Go to API Keys in Resend dashboard
   - Create a new API key
   - Copy the key (starts with `re_`)

3. **Add to .env file:**
   ```env
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```
   Note: You need to verify your domain in Resend, or use their test domain for development.

4. **Install Resend package:**
   ```bash
   npm install resend
   ```

5. **Update `app/api/notifications/email/route.ts`:**

   Replace the TODO section with:
   ```typescript
   import { Resend } from 'resend'
   
   const resend = new Resend(process.env.RESEND_API_KEY)
   
   await resend.emails.send({
     from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
     to: email,
     subject,
     html,
   })
   ```

## Option 2: SendGrid (Alternative)

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Get API key
3. Add `SENDGRID_API_KEY` to .env
4. Install: `npm install @sendgrid/mail`
5. Update email route accordingly

## Option 3: Use Supabase Auth Emails (Limited)

Supabase can send auth-related emails (password reset, email confirmation) but not custom transactional emails like payment confirmations or feedback notifications.

For those, you still need Resend, SendGrid, or similar.

## Current Status

The email notification system is set up and ready. It currently logs emails to the console in development mode. Once you add Resend (or another service), emails will be sent automatically when:
- Payments are completed
- Videos are submitted
- Mentors are assigned
- Feedback is ready
