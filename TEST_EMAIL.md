# Test Email Endpoint

Quick way to test the Gmail API integration.

## Usage

### Option 1: Browser (GET request)
Just visit this URL in your browser (while logged in):

```
https://your-vercel-url.vercel.app/api/test-email
```

Or with custom recipient:
```
https://your-vercel-url.vercel.app/api/test-email?to=your-email@example.com
```

Or with custom subject:
```
https://your-vercel-url.vercel.app/api/test-email?to=your-email@example.com&subject=My%20Test%20Email
```

### Option 2: cURL (POST request)
```bash
curl -X POST https://your-vercel-url.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com", "subject": "Test Email"}'
```

### Option 3: From Code
```typescript
const response = await fetch('/api/test-email?to=your-email@example.com')
const result = await response.json()
console.log(result)
```

## Response

### Success
```json
{
  "success": true,
  "message": "Test email sent successfully!",
  "details": {
    "recipient": "your-email@example.com",
    "from": "mvpweb@gmail.com",
    "subject": "🧪 Gmail API Test - MVP-IQ",
    "messageId": "1234567890",
    "timestamp": "2024-01-20T12:00:00.000Z",
    "oAuthStatus": {
      "hasAdminTokens": true,
      "adminEmail": "mvpweb@gmail.com",
      "isConnected": true
    }
  },
  "note": "Check your inbox (and spam folder) for the test email."
}
```

### Error
```json
{
  "success": false,
  "error": "Gmail OAuth is not configured...",
  "details": {
    "recipient": "your-email@example.com",
    "from": "mvpweb@gmail.com",
    "oAuthStatus": {
      "hasAdminTokens": false,
      "adminEmail": "Not found",
      "isConnected": false
    },
    "troubleshooting": [
      "1. Make sure an admin account has connected their Google account",
      "2. Go to /dashboard/settings as an admin and click 'Connect Google Calendar'",
      "3. Make sure Gmail scope is added in Google Cloud Console",
      "4. Check Vercel logs for detailed error messages"
    ]
  }
}
```

## Security

- Requires authentication (must be logged in)
- Only sends to specified email or admin email
- Safe to use in production (won't spam)

## Troubleshooting

1. **"Unauthorized"** → Make sure you're logged in
2. **"No admin tokens"** → Admin needs to connect Google account in settings
3. **"Gmail scope not found"** → Add Gmail scope in Google Cloud Console
4. **Email not received** → Check spam folder, verify recipient email
