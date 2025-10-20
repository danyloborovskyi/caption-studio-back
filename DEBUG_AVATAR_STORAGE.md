# Debug Avatar Storage RLS Issue

## Error: "new row violates row-level security policy"

This means the storage bucket isn't configured correctly. Follow these steps:

---

## Step 1: Create Avatars Bucket

1. Go to Supabase Dashboard → **Storage**
2. Click **"New bucket"** or **"Create a new bucket"**
3. Settings:
   - **Name**: `avatars` (exactly this, lowercase)
   - **Public bucket**: ✅ **CHECK THIS BOX** (very important!)
   - **File size limit**: Leave default or set to 5MB
   - **Allowed MIME types**: Leave empty or add: `image/jpeg, image/png, image/webp, image/gif`
4. Click **Create bucket**

---

## Step 2: Verify Bucket Exists

Run this in Supabase SQL Editor:

```sql
-- Check if avatars bucket exists
SELECT * FROM storage.buckets WHERE id = 'avatars';
```

**Expected result:** One row with `id = 'avatars'` and `public = true`

If no results or `public = false`:

- Bucket doesn't exist → Create it (Step 1)
- Not public → Make it public in Storage UI

---

## Step 3: Check Current Storage Policies

```sql
-- See all storage policies
SELECT
  policyname,
  cmd,
  qual,
  with_check,
  tablename
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;
```

Look for policies with "avatar" in the name. If none exist, continue to Step 4.

---

## Step 4: Apply Storage Policies (CORRECTED)

⚠️ **Important:** Drop old policies first if they exist, then create new ones.

Run this SQL in Supabase SQL Editor:

```sql
-- =====================================================
-- AVATAR STORAGE POLICIES (CORRECTED)
-- =====================================================

-- Drop existing policies if they exist (prevents duplicates)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar read access" ON storage.objects;

-- =====================================================
-- CREATE NEW POLICIES
-- =====================================================

-- Allow authenticated users to INSERT their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to UPDATE their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to DELETE their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow EVERYONE (public + authenticated) to read avatars
CREATE POLICY "Public avatar read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- =====================================================
-- VERIFY POLICIES WERE CREATED
-- =====================================================

SELECT
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;
```

**Expected result:** 4 policies created successfully.

---

## Step 5: Verify Storage Setup

Run this comprehensive check:

```sql
-- =====================================================
-- COMPREHENSIVE STORAGE CHECK
-- =====================================================

-- 1. Check bucket exists and is public
SELECT
  id as bucket_name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'avatars';

-- Expected: public = true

-- 2. Check policies exist
SELECT
  policyname,
  cmd as operation,
  roles,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- Expected: 4 policies (upload, update, delete, read)

-- 3. Test if current user can theoretically access
SELECT
  auth.uid() as current_user_id,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ Not authenticated'
    ELSE '✅ Authenticated'
  END as auth_status;
```

---

## Step 6: Test Upload Again

After completing Steps 1-5, test the avatar upload in Postman:

```
POST http://localhost:3000/api/auth/avatar
Headers: Authorization: Bearer YOUR_JWT_TOKEN
Body: form-data with "avatar" field (image file)
```

---

## Common Issues & Fixes

### Issue 1: Bucket doesn't exist

**Symptom:** First query in Step 2 returns no rows  
**Fix:** Create bucket in Supabase Storage UI (Step 1)

---

### Issue 2: Bucket is private (not public)

**Symptom:** Bucket exists but `public = false`  
**Fix:**

1. Go to Storage in Supabase Dashboard
2. Find "avatars" bucket
3. Click the 3-dot menu → **Settings**
4. Enable **"Public bucket"**
5. Save

---

### Issue 3: No storage policies exist

**Symptom:** Step 3 query returns 0 rows  
**Fix:** Run SQL from Step 4

---

### Issue 4: Policies exist but still getting error

**Symptom:** Policies exist, bucket is public, but upload fails  
**Fix:** The policy conditions might be wrong. Run this to drop and recreate:

```sql
-- Drop ALL avatar policies
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar read access" ON storage.objects;

-- Recreate with simpler conditions (more permissive for testing)
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
```

⚠️ **Note:** These simplified policies allow ANY authenticated user to upload/delete ANY file in avatars bucket. Use only for testing. Once it works, replace with the user-specific policies from Step 4.

---

### Issue 5: Still not working after all steps

Try this diagnostic:

```sql
-- Check if RLS is enabled on storage.objects
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- If rls_enabled = false, storage policies won't work
-- This should normally be true by default in Supabase
```

---

## Alternative: Disable RLS for Testing (NOT RECOMMENDED FOR PRODUCTION)

⚠️ **Only for debugging, NOT for production!**

```sql
-- Temporarily disable RLS on storage.objects (TESTING ONLY!)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Test upload - if it works, the issue is definitely the policies
-- Remember to re-enable:
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

---

## Summary Checklist

Before testing upload, verify:

- ✅ Bucket "avatars" exists
- ✅ Bucket is PUBLIC
- ✅ 4 storage policies exist (upload, update, delete, read)
- ✅ Policies target `storage.objects` table
- ✅ User is authenticated (has valid JWT token)
- ✅ RLS is enabled on storage.objects

---

## Quick Test After Setup

1. **Check bucket:**

   ```sql
   SELECT id, public FROM storage.buckets WHERE id = 'avatars';
   ```

   Should return: `avatars | true`

2. **Check policies:**

   ```sql
   SELECT count(*) FROM pg_policies
   WHERE tablename = 'objects' AND policyname LIKE '%avatar%';
   ```

   Should return: `4`

3. **Test upload:**
   ```
   POST /api/auth/avatar with valid token and image file
   ```
   Should return: `200 OK` with avatar URL

---

Need more help? Share the results of the SQL queries from Steps 2, 3, and 5!
