-- ================================================
-- STORAGE BUCKET RLS POLICIES FOR UPLOADS
-- ================================================
-- Run this in Supabase SQL Editor to fix storage upload errors

-- 1. Create the uploads bucket if it doesn't exist (or check in UI)
-- Go to Storage section and create bucket named "uploads" with public access

-- 2. Enable RLS on storage.objects table (should already be enabled)
-- This is managed by Supabase automatically

-- 3. Create policies for the uploads bucket

-- ============================================
-- POLICY: Users can upload to their own folder
-- ============================================
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================
-- POLICY: Users can view their own files
-- ============================================
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================
-- POLICY: Users can update their own files
-- ============================================
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================
-- POLICY: Users can delete their own files
-- ============================================
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================
-- POLICY: Public read access (optional)
-- ============================================
-- If you want files to be publicly readable (recommended for image hosting)
CREATE POLICY "Public can view all files in uploads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- ============================================
-- Verification Query
-- ============================================
-- Check if policies were created
SELECT 
  policyname,
  cmd,
  roles,
  with_check IS NOT NULL as has_check,
  qual IS NOT NULL as has_qual
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%upload%' OR policyname LIKE '%own%';

-- Expected: 4-5 policies for authenticated users + 1 optional public policy

