# Enable Gmail API - Quick Guide

## The Error

"Gmail API has not been used in project 286479882579 before or it is disabled"

## Quick Fix (1 minute)

### Option 1: Direct Link (Fastest)

1. **Click this link**: https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=286479882579
2. **Click the blue "ENABLE" button**
3. **Wait 1-2 minutes** for it to propagate
4. **Try the test email again**

### Option 2: Manual Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure project `286479882579` is selected (top dropdown)
3. Go to **APIs & Services** → **Library**
4. Search for **"Gmail API"**
5. Click on **"Gmail API"**
6. Click the blue **"ENABLE"** button
7. Wait 1-2 minutes for changes to propagate

## Verify It's Enabled

1. Go to **APIs & Services** → **Enabled APIs**
2. You should see **"Gmail API"** in the list

## Test Again

After enabling, wait 1-2 minutes, then test:
```
http://localhost:3000/api/test-email?to=your-email@example.com
```

## That's It! 🎉

Once Gmail API is enabled, email sending will work.
