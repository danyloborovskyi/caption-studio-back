-- Migration: Add User-Specific Data Isolation
-- Run this in your Supabase SQL Editor

-- ==========================================
-- Step 1: Add user_id column
-- ==========================================
ALTER TABLE uploaded_files 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ==========================================
-- Step 2: Create indexes for performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id 
ON uploaded_files(user_id);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_uploaded 
ON uploaded_files(user_id, uploaded_at DESC);

-- ==========================================
-- Step 3: Enable Row Level Security (RLS)
-- ==========================================
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Step 4: Create RLS Policies
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can insert own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can update own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can delete own files" ON uploaded_files;
DROP POLICY IF EXISTS "Service role can access all files" ON uploaded_files;

-- Policy: Users can only view their own files
CREATE POLICY "Users can view own files"
ON uploaded_files
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own files
CREATE POLICY "Users can insert own files"
ON uploaded_files
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own files
CREATE POLICY "Users can update own files"
ON uploaded_files
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can only delete their own files
CREATE POLICY "Users can delete own files"
ON uploaded_files
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Service role can access all files (for admin operations)
CREATE POLICY "Service role can access all files"
ON uploaded_files
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==========================================
-- Step 5: Handle existing data (OPTIONAL)
-- ==========================================

-- Option A: If you want to keep existing files as "legacy/public" files
-- Uncomment this policy to allow viewing files without user_id:
/*
CREATE POLICY "Legacy files are viewable by all"
ON uploaded_files
FOR SELECT
USING (user_id IS NULL);
*/

-- Option B: If you want to assign existing files to a specific user
-- First, create a user in Supabase Auth, then run:
/*
UPDATE uploaded_files 
SET user_id = 'YOUR_USER_UUID_HERE'
WHERE user_id IS NULL;
*/

-- Option C: If you want to delete all existing files without user_id
-- ⚠️ WARNING: This will delete data!
/*
DELETE FROM uploaded_files 
WHERE user_id IS NULL;
*/

-- ==========================================
-- Step 6: Create user storage statistics view (OPTIONAL)
-- ==========================================
CREATE OR REPLACE VIEW user_storage_stats AS
SELECT 
  user_id,
  COUNT(*) as total_files,
  SUM(file_size) as total_bytes,
  ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as total_mb,
  ROUND(SUM(file_size) / 1024.0 / 1024.0 / 1024.0, 3) as total_gb,
  COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as files_with_ai,
  MIN(uploaded_at) as first_upload,
  MAX(uploaded_at) as last_upload
FROM uploaded_files
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON user_storage_stats TO authenticated;

-- ==========================================
-- Verification Queries
-- ==========================================

-- Check if user_id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'uploaded_files' AND column_name = 'user_id';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'uploaded_files';

-- List all policies on uploaded_files
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'uploaded_files';

-- Check for files without user_id
SELECT COUNT(*) as files_without_user_id
FROM uploaded_files
WHERE user_id IS NULL;

-- View storage by user
SELECT * FROM user_storage_stats
ORDER BY total_bytes DESC
LIMIT 10;

-- ==========================================
-- Success! 🎉
-- ==========================================
-- Your database is now configured for user-specific data isolation.
-- Next steps:
-- 1. Update your backend routes to include authentication
-- 2. Test with multiple users
-- 3. Verify users can only see their own files

