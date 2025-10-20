-- =====================================================
-- AVATAR STORAGE QUICK FIX
-- =====================================================
-- Run this if you're getting RLS errors on avatar upload
-- =====================================================

-- STEP 1: Verify bucket exists and is public
SELECT 
  id as bucket_name,
  public,
  created_at
FROM storage.buckets 
WHERE id = 'avatars';

-- If no results: Create 'avatars' bucket in Storage UI first!
-- If public = false: Go to Storage UI → avatars → Settings → Enable "Public bucket"

-- =====================================================

-- STEP 2: Drop any existing avatar policies (clean slate)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;

-- =====================================================

-- STEP 3: Create simplified policies (easier to debug)
-- These allow ANY authenticated user to manage files in avatars bucket
-- Once working, you can add user-specific restrictions

CREATE POLICY "Authenticated users can upload to avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete from avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- =====================================================

-- STEP 4: Verify policies were created
SELECT 
  policyname,
  cmd as operation,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (policyname LIKE '%avatar%' OR policyname LIKE '%Authenticated users%')
ORDER BY policyname;

-- Expected: 4 policies

-- =====================================================
-- DONE! Now test avatar upload in Postman
-- =====================================================

-- If it works with these policies, you can optionally upgrade
-- to user-specific policies (see avatar-storage-setup.sql)

