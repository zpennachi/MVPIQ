# GitHub Setup Guide

## Step 1: Install Git (if not installed)

### Windows:
1. Download Git from: https://git-scm.com/download/win
2. Run the installer (use default settings)
3. Restart your terminal/PowerShell after installation

### Verify Installation:
```powershell
git --version
```

---

## Step 2: Configure Git (First Time Only)

Set your name and email (used for commits):

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Step 3: Initialize Git Repository

If git is not already initialized:

```powershell
git init
```

---

## Step 4: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Repository name: `football-feedback-app` (or your preferred name)
4. Description: "MVP-IQ - Football feedback platform"
5. Choose **Public** or **Private**
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **"Create repository"**

---

## Step 5: Add and Commit Files

```powershell
# Add all files
git add .

# Commit
git commit -m "Initial commit - MVP-IQ platform"
```

---

## Step 6: Connect to GitHub and Push

After creating the repository on GitHub, you'll see instructions. Use these commands:

```powershell
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/football-feedback-app.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

You'll be prompted for your GitHub username and password (or use a Personal Access Token).

---

## Step 7: Verify

Check your GitHub repository - you should see all your files!

---

## Troubleshooting

### "Git is not recognized"
- Install Git from https://git-scm.com/download/win
- Restart your terminal after installation

### "Authentication failed"
- Use a Personal Access Token instead of password:
  1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Generate new token
  3. Select scopes: `repo` (full control)
  4. Copy token and use it as password when pushing

### "Repository not found"
- Check the repository name matches exactly
- Verify you have access to the repository
- Make sure you're using the correct GitHub username

### "Large file" errors
- Make sure `.env` is in `.gitignore` (it already is)
- Make sure `node_modules` is in `.gitignore` (it already is)
- If you have large files, consider using Git LFS

---

## Next Steps After Pushing

Once your code is on GitHub:

1. ✅ Go to [vercel.com](https://vercel.com)
2. ✅ Click "Add New Project"
3. ✅ Import your GitHub repository
4. ✅ Follow the Vercel deployment guide (`VERCEL_DEPLOYMENT.md`)

---

*Ready to deploy! 🚀*
