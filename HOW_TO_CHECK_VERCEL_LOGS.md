# How to Check Vercel Logs

## Quick Steps:

1. **Go to Vercel Dashboard:**
   - Visit [vercel.com](https://vercel.com)
   - Log in to your account

2. **Navigate to Your Project:**
   - Click on your project (e.g., "mvpiq")
   - You'll see a list of deployments

3. **View Function Logs:**
   - Click on the latest deployment
   - Click on the **"Functions"** tab (or "Runtime Logs")
   - You'll see all API route logs there

4. **Or Use the Logs Tab:**
   - In your project dashboard, click **"Logs"** in the sidebar
   - This shows real-time logs from your functions

5. **Filter Logs:**
   - Use the search box to filter by function name (e.g., "calendar/test")
   - Look for entries with timestamps matching when you ran the test

## What to Look For:

When you run the test endpoint, look for log entries that contain:
- `"Calendar event created with conference data"`
- `"Meet link not in initial response"`
- `"fullConferenceData"` - this will show what Google returned
- Any error messages

## Alternative: Add Logging to Test Endpoint

If you can't find the logs, we can modify the test endpoint to return the full response in the JSON, so you can see it directly in the browser.
