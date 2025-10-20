# Fix Storage RLS Error

## The Problem

Your **database RLS** works perfectly ✅  
But your **Storage bucket** has its own RLS policies that are blocking uploads ❌

Error: `StorageApiError: new row violates row-level security policy`

---

## Quick Fix (Option 1): Make Bucket Public

This is the **easiest and fastest** solution for development:

### Step 1: Go to Supabase Dashboard

1. Open **Storage** section
2. Find the `uploads` bucket (or create it if missing)
3. Click the **three dots** (•••) next to the bucket name
4. Select **"Edit bucket"**
5. **Check** the box for **"Public bucket"**
6. Click **Save**

### Step 2: Add Public Access Policy

Run this in **Supabase SQL Editor**:

```sql
-- Allow public to read files (so URLs work)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- Allow authenticated users to insert files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');
```

### Step 3: Test Upload Again

Your upload should work now! 🎉

---

## Secure Fix (Option 2): User-Specific Storage Policies

For **production**, use this secure approach with user folders:

### Run This SQL in Supabase SQL Editor:

I've created the file `database/storage-policies.sql` with complete policies.

Or copy/paste this:

```sql
-- Users can upload to their own folder: images/{user_id}/
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can read their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Public can read all files (for sharing URLs)
CREATE POLICY "Public can view all files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');
```

---

## Verify Bucket Exists

Make sure the `uploads` bucket exists:

### In Supabase Dashboard:

1. Go to **Storage**
2. Check if `uploads` bucket exists
3. If not, click **"New bucket"**:
   - Name: `uploads`
   - Public: ✅ Yes (check this)
   - File size limit: 10 MB
   - Allowed MIME types: `image/*` (optional)
4. Click **Create**

---

## Check Storage Policies

After applying policies, verify them:

```sql
-- Check storage policies
SELECT
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';
```

Expected: At least 2 policies (INSERT for authenticated, SELECT for public)

---

## Test After Fix

1. ✅ Make sure bucket is public
2. ✅ Apply storage policies
3. ✅ Restart your server
4. ✅ Try upload again in Postman

You should see:

```
📤 User test@example.com uploading and analyzing image...
✅ Image uploaded to storage
✅ Image saved to database
✅ AI analysis complete
```

---

## Why This Happened

- Database RLS: ✅ Works (we tested this)
- Storage RLS: ❌ Was blocking uploads

Supabase Storage has **separate RLS policies** from the database. Your files are stored in `storage.objects` table, which needs its own policies.

---

## Recommended Setup

For most use cases:

- **Bucket:** Public (so image URLs work)
- **INSERT:** Authenticated users only (with folder restrictions)
- **SELECT:** Public (anyone can view via URL)
- **UPDATE/DELETE:** Authenticated users, own files only

This allows:
✅ Secure uploads (only authenticated users)  
✅ Public image URLs (for sharing)  
✅ User isolation (can't delete others' files)

---

## Quick Start

**Just do this:**

1. Make `uploads` bucket public in Supabase Dashboard
2. Run this SQL:

```sql
CREATE POLICY "Allow uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Allow reads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'uploads');
```

3. Test upload again

That's it! 🚀
