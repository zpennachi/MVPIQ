# Vercel Deployment Guide (Free Tier)

This guide will walk you through deploying your MVP-IQ app to Vercel's free tier.

## Prerequisites

1. **GitHub Account** (free) - Vercel integrates with GitHub
2. **Vercel Account** (free) - Sign up at [vercel.com](https://vercel.com)
3. **Supabase Project** (free tier available)
4. **Stripe Account** (free, only needed for payments)
5. **Resend Account** (free tier available, only needed for emails)

---

## Step 1: Prepare Your Code

### 1.1 Push to GitHub

If you haven't already, push your code to GitHub:

```bash
# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main
```

### 1.2 Verify Build Works Locally

Test that your app builds successfully:

```bash
npm run build
```

If the build succeeds, you're ready to deploy!

---

## Step 2: Deploy to Vercel

### 2.1 Connect Your Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

### 2.2 Configure Project Settings

Vercel should auto-detect:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

**Leave these as default** - they're already correct!

### 2.3 Add Environment Variables

Before deploying, add all your environment variables in Vercel:

Go to **Project Settings** → **Environment Variables** and add:

#### Required Variables:

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App URL (REQUIRED - will be your Vercel URL)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### Optional Variables (for production features):

```env
# Stripe (Optional - for payments)
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)

# Resend (Optional - for emails)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Cron (Optional - for scheduled tasks)
CRON_SECRET=your-secret-key-here
```

**Important Notes:**
- Add variables for **Production**, **Preview**, and **Development** environments
- `NEXT_PUBLIC_*` variables are exposed to the browser
- Never commit secrets to GitHub!

### 2.4 Deploy

Click **"Deploy"** and wait 2-3 minutes for the build to complete.

---

## Step 3: Configure External Services

### 3.1 Update Supabase Settings

1. Go to your Supabase project dashboard
2. **Settings** → **API** → **URL Configuration**
3. Add your Vercel domain to **Allowed URLs** (if using Supabase Auth):
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/*`

### 3.2 Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://your-app.vercel.app/api/webhooks/stripe
   ```
4. Select these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
5. Copy the **Signing secret** → Add to Vercel as `STRIPE_WEBHOOK_SECRET`

### 3.3 Update App URL in Vercel

After your first deployment, Vercel will give you a URL like:
```
https://your-app.vercel.app
```

1. Go to **Project Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL
3. Redeploy (or it will auto-redeploy on next push)

### 3.4 Configure Resend (Optional)

1. Go to [Resend Dashboard](https://resend.com)
2. Verify your domain (or use their test domain)
3. Get your API key → Add to Vercel as `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to your verified email

---

## Step 4: Run Database Migrations

Your Supabase database needs the schema. Run these SQL files in order:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run each file in this order:
   - `supabase/schema.sql` (base schema)
   - `supabase/calendar-schema.sql` (if using calendar features)
   - `supabase/session-credits-schema.sql` (if using session credits)
   - `supabase/homepage-editor-schema.sql` (if using homepage editor)
   - `supabase/profile-photos-storage-policies.sql` (if using profile photos)

---

## Step 5: Verify Deployment

### 5.1 Check Build Logs

1. Go to your Vercel project → **Deployments**
2. Click on the latest deployment
3. Check for any build errors

### 5.2 Test Your App

Visit your Vercel URL and test:
- ✅ Homepage loads
- ✅ Can register/login
- ✅ Can submit videos
- ✅ Can view dashboard
- ✅ Payments work (if Stripe configured)
- ✅ Emails send (if Resend configured)

---

## Step 6: Custom Domain (Optional)

Vercel free tier includes:
- ✅ Custom domain support
- ✅ SSL certificates (automatic)
- ✅ Global CDN

To add a custom domain:

1. Go to **Project Settings** → **Domains**
2. Add your domain (e.g., `mvpiq.com`)
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain
5. Update Stripe webhook URL to use custom domain

---

## Vercel Free Tier Limits

The free tier includes:

- ✅ **100GB bandwidth/month** (usually plenty for MVP)
- ✅ **100 serverless function invocations/day** (per function)
- ✅ **Unlimited static requests**
- ✅ **Automatic HTTPS**
- ✅ **Preview deployments** (for every PR)
- ✅ **Custom domains**

**Note:** If you exceed limits, Vercel will notify you. Most MVPs stay well within free tier.

---

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Check that all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error: "Environment variable missing"**
- Check Vercel Environment Variables are set
- Make sure variables are added to **Production** environment

**Error: "TypeScript errors"**
- Fix TypeScript errors locally first
- Run `npm run build` locally to catch errors

### Runtime Errors

**"Supabase connection failed"**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
- Check Supabase project is active
- Verify RLS policies are set up

**"Stripe webhook fails"**
- Verify webhook URL is correct in Stripe dashboard
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe
- Verify webhook events are selected

**"Emails not sending"**
- Check Resend API key is correct
- Verify `RESEND_FROM_EMAIL` is verified in Resend
- Check Resend dashboard for error logs

### Performance Issues

**Slow builds:**
- Vercel caches `node_modules` automatically
- Large dependencies may slow builds (normal)

**Slow API routes:**
- Check Supabase query performance
- Consider adding database indexes
- Use Vercel's Edge Functions for simple routes

---

## Continuous Deployment

Once connected to GitHub:

- ✅ **Every push to `main`** → Auto-deploys to production
- ✅ **Every PR** → Creates preview deployment
- ✅ **Rollback** → One-click rollback to previous deployment

---

## Security Checklist

Before going live:

- [ ] All environment variables are set in Vercel (not in code)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is secret (never in client code)
- [ ] Stripe keys are production keys (not test keys)
- [ ] Webhook secret is set and matches Stripe
- [ ] Resend API key is set
- [ ] Supabase RLS policies are configured
- [ ] Custom domain has SSL (automatic with Vercel)

---

## Cost Estimate (Free Tier)

**Vercel Free Tier:**
- ✅ Hosting: **FREE**
- ✅ Bandwidth: **FREE** (100GB/month)
- ✅ Functions: **FREE** (100 invocations/day per function)

**External Services:**
- **Supabase**: Free tier includes 500MB database, 1GB storage, 2GB bandwidth
- **Stripe**: 2.9% + $0.30 per transaction (only when processing payments)
- **Resend**: Free tier includes 3,000 emails/month

**Total Monthly Cost: $0** (until you exceed free tier limits)

---

## Next Steps After Deployment

1. ✅ Test all features on production URL
2. ✅ Set up monitoring (Vercel Analytics - free tier available)
3. ✅ Configure error tracking (optional - Sentry free tier)
4. ✅ Set up custom domain
5. ✅ Update Stripe webhook to production URL
6. ✅ Test payment flow end-to-end
7. ✅ Send test emails to verify Resend works

---

## Quick Reference

**Vercel Dashboard:** https://vercel.com/dashboard
**Supabase Dashboard:** https://app.supabase.com
**Stripe Dashboard:** https://dashboard.stripe.com
**Resend Dashboard:** https://resend.com/dashboard

**Your App URL:** `https://your-app.vercel.app`

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Supabase Docs:** https://supabase.com/docs
- **Stripe Docs:** https://stripe.com/docs

---

*Last Updated: 2024*
