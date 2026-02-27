# Deployment Guide

## Recommended: Vercel (Easiest & Best for Next.js)

Vercel is made by the Next.js team and offers the best integration. It's free for hobby projects and has excellent Supabase integration.

### Quick Deploy to Vercel:

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/football-feedback-app.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables in Vercel:**
   Go to Project Settings → Environment Variables and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
   RESEND_API_KEY=your-resend-api-key
   RESEND_FROM_EMAIL=onboarding@resend.dev
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **Deploy!**
   - Click "Deploy"
   - Your app will be live in ~2 minutes
   - Vercel gives you a free domain: `your-app.vercel.app`

5. **Update Stripe Webhook:**
   - Go to Stripe Dashboard → Webhooks
   - Update webhook URL to: `https://your-app.vercel.app/api/webhooks/stripe`

6. **Update Resend From Email (Optional):**
   - Verify your domain in Resend
   - Update `RESEND_FROM_EMAIL` to use your domain

### Vercel Benefits:
- ✅ Free tier (hobby projects)
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments on git push
- ✅ Preview deployments for PRs
- ✅ Built-in analytics
- ✅ Zero configuration needed

---

## Alternative Options:

### Option 2: Netlify
Similar to Vercel, also free tier available.

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Import from GitHub
4. Build command: `npm run build`
5. Publish directory: `.next`
6. Add environment variables

### Option 3: Railway
Good for full-stack apps, pay-as-you-go pricing.

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Add environment variables
4. Deploy

### Option 4: Render
Free tier available, similar to Heroku.

1. Go to [render.com](https://render.com)
2. New Web Service
3. Connect GitHub repo
4. Build: `npm install && npm run build`
5. Start: `npm start`
6. Add environment variables

### Option 5: Self-Hosting (VPS)
If you want full control:
- DigitalOcean Droplet
- AWS EC2
- Google Cloud Run
- Azure App Service

Requires more setup (Docker, nginx, SSL certificates, etc.)

---

## Architecture Overview:

```
┌─────────────────┐
│   Vercel/Netlify│  ← Hosts your Next.js app (frontend + API routes)
│   (Your App)    │
└────────┬────────┘
         │
         ├──→ Supabase (Database, Auth, Storage)
         ├──→ Stripe (Payments)
         └──→ Resend (Emails)
```

**Supabase** = Backend services (database, auth, file storage)
**Vercel** = Frontend hosting (your Next.js app)

---

## Post-Deployment Checklist:

- [ ] Update `NEXT_PUBLIC_APP_URL` to your production domain
- [ ] Update Stripe webhook URL
- [ ] Test email notifications
- [ ] Test video uploads
- [ ] Test payment flow (use Stripe test mode first)
- [ ] Set up custom domain (optional)
- [ ] Enable production Stripe keys
- [ ] Set up monitoring/analytics

---

## Recommended Setup:

**For MVP/Production:**
- **Hosting:** Vercel (free tier)
- **Database/Auth:** Supabase (free tier)
- **Payments:** Stripe (pay per transaction)
- **Emails:** Resend (free tier: 3,000 emails/month)

Total cost: **$0/month** (until you scale)
