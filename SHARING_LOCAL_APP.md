# Sharing Your Local App with Clients

## Option 1: ngrok (Recommended - Easiest)

ngrok creates a secure tunnel to your localhost.

### Setup:

1. **Download ngrok:**
   - Go to [ngrok.com/download](https://ngrok.com/download)
   - Download for Windows
   - Extract the .exe file to a folder (e.g., `C:\ngrok\`)

2. **Sign up for free account:**
   - Go to [ngrok.com](https://ngrok.com) and sign up (free)
   - Get your authtoken from the dashboard

3. **Configure ngrok:**
   ```powershell
   # In PowerShell (run as Administrator)
   cd C:\ngrok
   .\ngrok.exe authtoken YOUR_AUTH_TOKEN_HERE
   ```

4. **Start your dev server:**
   ```powershell
   npm run dev
   ```

5. **In a new terminal, start ngrok:**
   ```powershell
   cd C:\ngrok
   .\ngrok.exe http 3000
   ```

6. **Share the URL:**
   - ngrok will give you a URL like: `https://abc123.ngrok-free.app`
   - Share this URL with your client
   - The URL works as long as both your dev server and ngrok are running

### ngrok Free Tier:
- ✅ Free forever
- ✅ HTTPS included
- ✅ Random URL (changes each time you restart)
- ⚠️ URL expires after 2 hours (restart to get new one)

### ngrok Paid ($8/month):
- Custom domain
- Permanent URLs
- No time limits

---

## Option 2: Cloudflare Tunnel (Free, No Signup)

Cloudflare Tunnel is free and doesn't require signup.

### Setup:

1. **Install cloudflared:**
   ```powershell
   # Using winget (Windows 11) or download from cloudflare.com
   winget install --id Cloudflare.cloudflared
   ```

2. **Start tunnel:**
   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```

3. **Share the URL** it gives you (like `https://random-name.trycloudflare.com`)

---

## Option 3: Deploy to Vercel (Best for Production Demo)

Actually deploying to Vercel takes ~5 minutes and gives you a permanent URL.

### Quick Deploy:

1. **Push to GitHub:**
   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   # Create repo on GitHub, then:
   git remote add origin https://github.com/yourusername/football-feedback-app.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project"
   - Import your repo
   - Add environment variables
   - Deploy!

3. **Get permanent URL:**
   - Vercel gives you: `https://your-app.vercel.app`
   - This URL stays active forever
   - Auto-updates when you push to GitHub

**This is actually the fastest way to get a shareable URL!**

---

## Option 4: VS Code Port Forwarding

If you're using VS Code:

1. Open Command Palette (Ctrl+Shift+P)
2. Type "Port Forwarding"
3. Forward port 3000
4. Share the generated URL

---

## Recommendation:

**For quick demo:** Use **ngrok** (5 minutes setup)
**For production demo:** Deploy to **Vercel** (10 minutes, permanent URL)

---

## Important Notes:

⚠️ **When sharing localhost:**
- Your dev server must stay running
- Your computer must stay on
- Internet connection must be active
- For production, deploy to Vercel instead

✅ **When deployed to Vercel:**
- Always online
- No need to keep computer on
- Professional URL
- Better performance
