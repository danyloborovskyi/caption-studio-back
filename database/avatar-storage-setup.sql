-- =====================================================
-- Avatar Storage Setup
-- =====================================================
-- 
-- This script sets up storage policies for the 'avatars' bucket.
-- 
-- Prerequisites:
-- 1. Create 'avatars' bucket in Supabase Storage (via UI)
--    - Name: avatars (lowercase)
--    - Public: ✅ YES (must be checked!)
-- 2. Run this SQL script in Supabase SQL Editor
--
-- =====================================================

-- Drop existing policies if they exist (prevents duplicates)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar read access" ON storage.objects;

-- =====================================================
-- CREATE STORAGE POLICIES
-- =====================================================

-- Allow authenticated users to upload their own avatars
-- Files must be in their own user_id folder
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (so avatars can be displayed)
CREATE POLICY "Public avatar read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- =====================================================
-- Verification Queries
-- =====================================================

-- 1. Check if avatars bucket exists and is public
SELECT 
  id as bucket_name,
  public,
  created_at
FROM storage.buckets 
WHERE id = 'avatars';
-- Expected: One row with public = true

-- 2. Check if policies were created successfully
SELECT 
  policyname,
  cmd as operation,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;
-- Expected: 4 policies (upload, update, delete, read)

-- 3. List all policies details
SELECT 
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Has USING clause'
    ELSE 'No USING'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN '✅ Has WITH CHECK clause'
    ELSE 'No WITH CHECK'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- =====================================================
-- Troubleshooting
-- =====================================================
-- 
-- If you get "new row violates row-level security policy":
-- 
-- 1. Verify bucket exists and is PUBLIC (query #1 above)
-- 2. Verify 4 policies exist (query #2 above)
-- 3. Make sure you're authenticated (valid JWT token)
-- 4. Check DEBUG_AVATAR_STORAGE.md for detailed troubleshooting
-- 
-- =====================================================

-- =====================================================
-- Testing
-- =====================================================
-- 
-- After running this script:
-- 1. Test avatar upload: POST /api/auth/avatar
-- 2. Test avatar delete: DELETE /api/auth/avatar
-- 3. Test public access: Open avatar URL in browser
-- 
-- =====================================================

