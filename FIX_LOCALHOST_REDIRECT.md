# Fix Localhost Redirect Issue

If you're being redirected to the production URL when logging in on localhost, follow these steps:

## Step 1: Check Supabase Redirect URLs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, make sure you have:
   - `http://localhost:3000`
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/**` (wildcard for all localhost routes)
5. Under **Site URL**, you can set:
   - `http://localhost:3000` (for local development)
   - Or leave it as production URL (Supabase will use redirect URLs for OAuth)

## Step 2: Verify Your .env File

Make sure your `.env` file has:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Clear Browser Cache

1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Clear **Local Storage** and **Session Storage**
4. Clear **Cookies** for localhost:3000

## Step 4: Test Login

1. Go to `http://localhost:3000/login`
2. Log in with your credentials
3. You should stay on `http://localhost:3000/dashboard` (not redirect to production)

## Step 5: If Still Redirecting

If you're still being redirected after login:

1. **Check the URL in your browser** - what exact URL does it redirect to?
2. **Check browser console** - any errors?
3. **Check Network tab** - look for redirects (status 307/308)

## Common Issues

### Issue: Supabase only has production URL configured
**Solution**: Add localhost URLs to Supabase redirect URLs (Step 1)

### Issue: Browser has production URL cached
**Solution**: Clear browser cache and cookies (Step 3)

### Issue: .env file has production URL
**Solution**: Make sure `.env` has `NEXT_PUBLIC_APP_URL=http://localhost:3000` (Step 2)

### Issue: Using same Supabase project for dev and production
**Solution**: Consider using separate Supabase projects for dev and production, or ensure both URLs are in redirect URLs
