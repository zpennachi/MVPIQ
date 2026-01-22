-- Comprehensive Supabase Diagnostic Check
-- Run this to identify warnings, errors, and potential issues
-- Copy the entire output and share it for review

-- ============================================
-- 1. CHECK FOR ORPHANED RECORDS
-- ============================================
SELECT '=== ORPHANED RECORDS ===' as check_type;

-- Orphaned feedback submissions (no video)
SELECT 
  'feedback_submissions without videos' as issue,
  COUNT(*) as count
FROM feedback_submissions fs
LEFT JOIN videos v ON fs.video_id = v.id
WHERE v.id IS NULL;

-- Orphaned booked sessions (no availability slot)
SELECT 
  'booked_sessions without availability_slots' as issue,
  COUNT(*) as count
FROM booked_sessions bs
LEFT JOIN availability_slots av ON bs.availability_slot_id = av.id
WHERE av.id IS NULL;

-- Profiles without auth users
SELECT 
  'profiles without auth.users' as issue,
  COUNT(*) as count
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL;

-- Team members without profiles
SELECT 
  'team_members without profiles' as issue,
  COUNT(*) as count
FROM team_members tm
LEFT JOIN profiles p ON tm.player_id = p.id
WHERE p.id IS NULL;

-- ============================================
-- 2. CHECK FOR MISSING INDEXES
-- ============================================
SELECT '=== MISSING INDEXES ===' as check_type;

-- Check for foreign keys without indexes
SELECT
  'Foreign key without index' as issue,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
LEFT JOIN pg_indexes pi ON 
  pi.tablename = tc.table_name 
  AND pi.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND pi.indexname IS NULL
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 3. CHECK FOR INVALID DATA
-- ============================================
SELECT '=== INVALID DATA ===' as check_type;

-- Profiles with invalid roles
SELECT 
  'profiles with invalid role' as issue,
  id,
  email,
  role
FROM profiles
WHERE role NOT IN ('player', 'mentor', 'coach', 'admin', 'school');

-- Availability slots with invalid time ranges
SELECT 
  'availability_slots with end_time <= start_time' as issue,
  COUNT(*) as count
FROM availability_slots
WHERE end_time <= start_time;

-- Booked sessions with invalid time ranges
SELECT 
  'booked_sessions with end_time <= start_time' as issue,
  COUNT(*) as count
FROM booked_sessions
WHERE end_time <= start_time;

-- Feedback submissions with invalid status
SELECT 
  'feedback_submissions with invalid status' as issue,
  COUNT(*) as count
FROM feedback_submissions
WHERE status NOT IN ('pending', 'assigned', 'in_progress', 'completed', 'paid');

-- ============================================
-- 4. CHECK TABLE STATISTICS
-- ============================================
SELECT '=== TABLE STATISTICS ===' as check_type;

SELECT 
  schemaname,
  relname as tablename,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  CASE 
    WHEN n_live_tup > 0 
    THEN ROUND((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
    ELSE 0
  END as dead_row_percentage,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ============================================
-- 5. CHECK FOR UNUSED/EMPTY TABLES
-- ============================================
SELECT '=== EMPTY TABLES ===' as check_type;

SELECT 
  'Empty table' as issue,
  relname as tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup = 0
ORDER BY relname;

-- ============================================
-- 6. CHECK RLS POLICIES
-- ============================================
SELECT '=== RLS POLICY STATUS ===' as check_type;

SELECT 
  pt.schemaname,
  pt.tablename,
  pc.relrowsecurity as rls_enabled,
  (SELECT COUNT(*) 
   FROM pg_policies pp
   WHERE pp.schemaname = pt.schemaname 
     AND pp.tablename = pt.tablename) as policy_count
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = pt.schemaname
WHERE pt.schemaname = 'public'
ORDER BY pt.tablename;

-- ============================================
-- 7. CHECK FOR DUPLICATE DATA
-- ============================================
SELECT '=== POTENTIAL DUPLICATES ===' as check_type;

-- Duplicate emails in profiles
SELECT 
  'Duplicate emails in profiles' as issue,
  email,
  COUNT(*) as count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- Duplicate availability slots (same mentor, same time)
SELECT 
  'Duplicate availability slots' as issue,
  mentor_id,
  start_time,
  COUNT(*) as count
FROM availability_slots
WHERE is_active = true
GROUP BY mentor_id, start_time
HAVING COUNT(*) > 1;

-- ============================================
-- 8. CHECK FOR LARGE TABLES (VACUUM NEEDED)
-- ============================================
SELECT '=== TABLES NEEDING VACUUM ===' as check_type;

SELECT 
  'Table needs vacuum' as issue,
  relname as tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  CASE 
    WHEN n_live_tup > 0 
    THEN ROUND((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
    ELSE 0
  END as dead_percentage
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 1000
  AND (n_live_tup = 0 OR (n_dead_tup::numeric / NULLIF(n_live_tup, 0)) > 0.1)
ORDER BY n_dead_tup DESC;

-- ============================================
-- 9. CHECK FOR MISSING CONSTRAINTS
-- ============================================
SELECT '=== MISSING CONSTRAINTS ===' as check_type;

-- Check for nullable foreign keys that should be NOT NULL
SELECT 
  'Nullable foreign key' as issue,
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%_id'
  AND is_nullable = 'YES'
  AND column_name NOT IN ('invited_by', 'submitted_by', 'created_by') -- These can be nullable
ORDER BY table_name, column_name;

-- ============================================
-- 10. CHECK STORAGE SIZE
-- ============================================
SELECT '=== STORAGE SIZE ===' as check_type;

SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- SUMMARY
-- ============================================
SELECT '=== SUMMARY ===' as check_type;
SELECT 
  'Total tables' as metric,
  COUNT(*)::text as value
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Total RLS enabled tables',
  COUNT(*)::text
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE pt.schemaname = 'public'
  AND pc.relrowsecurity = true
UNION ALL
SELECT 
  'Total indexes',
  COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'public';
