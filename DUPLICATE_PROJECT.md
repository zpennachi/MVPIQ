# How to Duplicate This Project

This guide will help you create a copy of this project for other startup concepts.

## Quick Method (Recommended)

### Option 1: Using Git (Best for version control)

1. **Create a new repository** on GitHub/GitLab for your new project
2. **Clone this project** to a new directory:
   ```bash
   cd ..
   git clone <original-repo-url> <new-project-name>
   cd <new-project-name>
   ```
3. **Remove the old git remote** and add your new one:
   ```bash
   git remote remove origin
   git remote add origin <new-repo-url>
   ```
4. **Follow the setup steps below** to configure the new project

### Option 2: Manual Copy

1. **Copy the entire project folder** to a new location:
   ```bash
   # Windows PowerShell
   Copy-Item -Path "football-feedback-app" -Destination "../new-project-name" -Recurse
   
   # Or use File Explorer to copy the folder
   ```
2. **Rename the folder** to your new project name
3. **Follow the setup steps below**

## Setup Steps for New Project

### 1. Update Project Name

Update `package.json`:
```json
{
  "name": "your-new-project-name",
  "version": "1.0.0",
  "description": "Your new project description"
}
```

### 2. Update Environment Variables

Create a new `.env.local` file and update:
- `NEXT_PUBLIC_APP_URL` - Your new app URL
- Supabase project URL and keys (create a new Supabase project)
- Stripe keys (if using a new Stripe account)
- Resend API key (if using a new Resend account)

### 3. Update App Metadata

Update `app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: "Your New App Name",
  description: "Your new app description",
};
```

### 4. Create New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Run all SQL migrations from the `supabase/` folder in order:
   - `schema.sql`
   - `calendar-schema.sql`
   - `session-credits-schema.sql`
   - `homepage-editor-schema.sql`
   - Any other migration files you need
4. Update `.env.local` with new Supabase credentials

### 5. Update Branding

- Replace logo files in `public/` or `components/ui/Logo.tsx`
- Update colors in `tailwind.config.ts` if needed
- Update homepage content via admin dashboard or `components/homepage/DynamicHomepage.tsx`

### 6. Clean Up Project-Specific Code

- Update database types in `types/database.ts` if your domain changes
- Update email templates in `app/api/notifications/email/route.ts`
- Update any hardcoded references to "MVP-IQ", "Football", etc.

### 7. Install Dependencies

```bash
npm install
```

### 8. Run the Project

```bash
npm run dev
```

## What to Keep vs. Change

### Keep (Core Architecture):
- ✅ Next.js App Router structure
- ✅ Supabase authentication setup
- ✅ Database schema patterns
- ✅ API route structure
- ✅ Component organization
- ✅ Payment integration (Stripe)
- ✅ Email system (Resend)

### Change (Project-Specific):
- 🔄 Project name and branding
- 🔄 Database schema (tables, fields specific to your domain)
- 🔄 User roles (if different from player/mentor/coach/admin)
- 🔄 Business logic
- 🔄 UI/UX and styling
- 🔄 Email templates
- 🔄 Homepage content

## Quick Start Scripts

### Windows (PowerShell)

```powershell
.\duplicate-project.ps1 -NewProjectName "my-new-project"
```

### Mac/Linux (Bash)

```bash
chmod +x duplicate-project.sh
./duplicate-project.sh my-new-project
```

These scripts will:
- Copy the entire project (excluding node_modules, .next, .git, etc.)
- Update `package.json` with the new project name
- Remove the old git remote
- Create a `.env.local` template file
- Provide next steps instructions
