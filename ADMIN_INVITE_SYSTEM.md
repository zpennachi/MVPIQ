# Admin Invite System

## Overview

The admin dashboard now supports inviting mentors and schools, while players and coaches can register directly. All user types (players, coaches, schools, mentors, admins) are visible in the admin dashboard.

## Changes Made

### 1. Added 'school' Role
- Updated `types/database.ts` to include 'school' in `UserRole` type
- Created SQL migration: `supabase/add-school-role.sql`
- Updated validation schemas to support 'school' role

### 2. Updated Registration Page
- **Mentors and schools are now invite-only** - removed from registration dropdown
- Only "Player" and "Coach" options remain for public registration
- Added note: "Mentors and schools must be invited by an admin"

### 3. Enhanced Admin Dashboard
- **UserManagement component** now shows ALL roles including schools
- Added "Invite User" button in UserManagement
- Invite modal allows inviting mentors or schools
- All users (players, coaches, schools, mentors, admins) are visible and manageable

### 4. Invite System
- Created `/api/admin/invite-user` endpoint
- Admins can invite mentors and schools via email
- Invited users receive:
  - Account created automatically
  - Password reset link (to set their own password)
  - Welcome email with login instructions

## Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- Add 'school' role to profiles table
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('player', 'mentor', 'coach', 'admin', 'school'));
```

## How to Use

### Inviting a Mentor or School:

1. Go to Admin Dashboard → User Management
2. Click "Invite User" button
3. Select role: "Mentor/Professional Athlete" or "School"
4. Enter email address (required)
5. Enter full name (optional)
6. Click "Send Invitation"

The system will:
- Create the user account
- Send a password reset email
- Send a welcome email with login instructions

### Managing All Users:

- Filter by role: All, Players, Coaches, Schools, Mentors, Admins
- Edit user details
- Reset passwords
- Activate/deactivate users

## Role Permissions

- **Players**: Can register directly, submit videos, view feedback
- **Coaches**: Can register directly, create teams, invite players
- **Mentors**: Must be invited by admin, provide feedback
- **Schools**: Must be invited by admin
- **Admins**: Full access, can invite mentors and schools

## Files Changed

- `types/database.ts` - Added 'school' to UserRole
- `components/admin/UserManagement.tsx` - Added invite functionality, school filter
- `app/register/page.tsx` - Removed mentor/school from registration
- `app/api/admin/invite-user/route.ts` - New invite endpoint
- `lib/validations.ts` - Updated role enums
- `supabase/add-school-role.sql` - Database migration
