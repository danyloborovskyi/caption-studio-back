# Step-by-Step RLS Debugging Guide

Let's check each part of the setup to find the issue.

---

## ✅ Step 1: Verify Database Schema

### Check if `user_id` column exists

Run this in **Supabase SQL Editor**:

```sql
-- Check if user_id column exists
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'uploaded_files'
  AND column_name = 'user_id';
```

**Expected Result:**

```
column_name | data_type | is_nullable | column_default
user_id     | uuid      | YES         | NULL
```

**If empty:** Run this to add the column:

```sql
ALTER TABLE uploaded_files
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
```

---

## ✅ Step 2: Check RLS Status

### Verify RLS is enabled

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'uploaded_files';
```

**Expected Result:**

```
tablename      | rowsecurity
uploaded_files | true
```

**If false:** Enable RLS:

```sql
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
```

---

## ✅ Step 3: Check RLS Policies

### List all policies

```sql
-- List all policies on uploaded_files table
SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'uploaded_files';
```

**Expected Policies:**

1. "Users can view own files" (SELECT)
2. "Users can insert own files" (INSERT)
3. "Users can update own files" (UPDATE)
4. "Users can delete own files" (DELETE)

**If policies are missing:** Create them:

```sql
-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can insert own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can update own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can delete own files" ON uploaded_files;

-- Create SELECT policy
CREATE POLICY "Users can view own files"
ON uploaded_files
FOR SELECT
USING (auth.uid() = user_id);

-- Create INSERT policy
CREATE POLICY "Users can insert own files"
ON uploaded_files
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy
CREATE POLICY "Users can update own files"
ON uploaded_files
FOR UPDATE
USING (auth.uid() = user_id);

-- Create DELETE policy
CREATE POLICY "Users can delete own files"
ON uploaded_files
FOR DELETE
USING (auth.uid() = user_id);
```

---

## ✅ Step 4: Verify User Exists

### Check if your test user exists in auth.users

```sql
-- Check if user exists
SELECT
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'test@example.com';  -- Replace with your test email
```

**Expected:** Should return one row with user details.

**If empty:** User doesn't exist. Sign up first:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## ✅ Step 5: Test Auth Middleware

### Check if middleware is setting req.token

Add temporary logging to your auth middleware:

**File:** `middleware/auth.js`

Add this console.log after setting req.token:

```javascript
// Attach the token for further use
req.token = token;

// ✅ ADD THIS LINE FOR DEBUGGING
console.log(
  "🔑 Auth middleware - Token set:",
  token ? "YES" : "NO",
  token ? token.substring(0, 30) + "..." : "NONE"
);

next();
```

**Expected in console:** You should see `🔑 Auth middleware - Token set: YES eyJhbGci...`

---

## ✅ Step 6: Check Environment Variables

### Verify Supabase keys are set

**File:** `.env`

```bash
# Check if these are set
cat .env | grep SUPABASE
```

**Expected:**

```
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...  (long key starting with eyJ)
SUPABASE_SERVICE_KEY=eyJhbGci...  (different long key)
```

**Make sure:**

- SUPABASE_URL ends with `.supabase.co`
- SUPABASE_ANON_KEY starts with `eyJ`
- Keys are different (anon vs service)

**To get keys:**

1. Go to Supabase Dashboard
2. Click your project
3. Settings → API
4. Copy "Project URL" and "anon public" key

---

## ✅ Step 7: Test Token Manually

### Test if Supabase accepts your JWT token

Run this in **Supabase SQL Editor**:

```sql
-- First, get your user ID
SELECT id FROM auth.users WHERE email = 'test@example.com';
```

Copy the ID, then try inserting directly:

```sql
-- Try manual insert (replace USER_ID_HERE with actual ID)
INSERT INTO uploaded_files (
  filename,
  file_path,
  file_size,
  mime_type,
  public_url,
  user_id
) VALUES (
  'test.jpg',
  'images/test.jpg',
  1000,
  'image/jpeg',
  'https://test.com/test.jpg',
  'USER_ID_HERE'  -- Replace with your user ID
);
```

**If this fails:** RLS policies are blocking even direct inserts. Check policies again.

**If this succeeds:** The issue is with how the JWT token is being passed.

---

## ✅ Step 8: Check Supabase Client Configuration

### Add debug logging to upload route

**File:** `routes/upload.js`

In the `/upload-and-analyze` route, add logging:

```javascript
// Get authenticated user ID and token
const userId = req.user.id;
const userEmail = req.user.email;
const userToken = req.token;

// ✅ ADD THESE DEBUG LOGS
console.log("👤 User ID:", userId);
console.log("📧 User Email:", userEmail);
console.log(
  "🔑 User Token:",
  userToken ? userToken.substring(0, 30) + "..." : "MISSING!"
);

// Create user-specific Supabase client
const supabase = getSupabaseClient(userToken);
```

**Run upload and check console for:**

```
👤 User ID: abc-123-def-456
📧 User Email: test@example.com
🔑 User Token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

**If token is MISSING:** The auth middleware isn't setting `req.token`.

---

## ✅ Step 9: Verify Storage Bucket

### Check if 'uploads' bucket exists

1. Go to **Supabase Dashboard** → **Storage**
2. Look for bucket named `uploads`

**If missing:**

1. Click "Create bucket"
2. Name: `uploads`
3. Make it **Public**
4. Click "Create"

### Check bucket permissions

```sql
-- Check storage bucket policies
SELECT * FROM storage.buckets WHERE name = 'uploads';
```

**Expected:** `public: true`

---

## ✅ Step 10: Test with Service Key (Bypass RLS)

### Temporarily test without RLS

**File:** `routes/upload.js` (temporary change)

Create a test endpoint that bypasses RLS:

```javascript
// Temporary test endpoint - uses service key to bypass RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

router.post(
  "/test-upload-bypass-rls",
  authenticateUser,
  upload.single("image"),
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Test insert with service key (bypasses RLS)
      const { data, error } = await supabaseAdmin
        .from("uploaded_files")
        .insert([
          {
            filename: "test.jpg",
            file_path: "images/test.jpg",
            file_size: 1000,
            mime_type: "image/jpeg",
            public_url: "https://test.com",
            user_id: userId,
            status: "uploaded",
          },
        ])
        .select();

      res.json({
        success: !error,
        message: error ? "Failed" : "Success with service key",
        data,
        error: error?.message,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
```

**Test this endpoint:**

```bash
curl -X POST http://localhost:3000/api/upload/test-upload-bypass-rls \
  -H "Authorization: Bearer $TOKEN"
```

**If this works:** RLS is the issue. Policies need fixing.  
**If this fails too:** Database schema or constraint issue.

---

## 🔍 Common Issues & Solutions

### Issue 1: "auth.uid() is null"

**Problem:** JWT token not being recognized by Supabase

**Solution:** Make sure you're using the correct Supabase URL and keys. The JWT must be issued by the same Supabase project.

**Check:**

```sql
-- Test if auth context is working
SELECT auth.uid();
```

If this returns `NULL` when run with a JWT, your token isn't being recognized.

### Issue 2: "user_id cannot be null"

**Problem:** Database has `NOT NULL` constraint on user_id

**Solution:**

```sql
-- Remove NOT NULL constraint if it exists
ALTER TABLE uploaded_files
ALTER COLUMN user_id DROP NOT NULL;
```

### Issue 3: "foreign key constraint"

**Problem:** User ID doesn't exist in auth.users

**Solution:** Make sure user is signed up:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Issue 4: RLS policies are too restrictive

**Problem:** Policies block even legitimate inserts

**Temporary Solution:** Disable RLS for testing:

```sql
-- TEMPORARY: Disable RLS to test
ALTER TABLE uploaded_files DISABLE ROW LEVEL SECURITY;

-- Test your upload...

-- Re-enable when done testing
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
```

---

## 📋 Debugging Checklist

Run through this checklist:

- [ ] `user_id` column exists in `uploaded_files` table
- [ ] RLS is enabled on `uploaded_files` table
- [ ] All 4 RLS policies exist (SELECT, INSERT, UPDATE, DELETE)
- [ ] Test user exists in `auth.users` table
- [ ] `SUPABASE_URL` is set correctly in `.env`
- [ ] `SUPABASE_ANON_KEY` is set correctly in `.env`
- [ ] Auth middleware sets `req.token`
- [ ] `req.token` is being passed to `getSupabaseClient()`
- [ ] `uploads` storage bucket exists and is public
- [ ] Console shows user ID, email, and token when uploading
- [ ] Manual SQL insert works with your user ID

---

## 🚨 Quick Diagnostic Script

Run this in **Supabase SQL Editor** to check everything:

```sql
-- === DIAGNOSTIC SCRIPT ===

-- 1. Check user_id column
SELECT 'Column Check' as test,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_files' AND column_name = 'user_id'
  ) THEN '✅ user_id column exists'
  ELSE '❌ user_id column MISSING'
  END as result;

-- 2. Check RLS status
SELECT 'RLS Check' as test,
  CASE WHEN rowsecurity THEN '✅ RLS enabled'
  ELSE '❌ RLS disabled'
  END as result
FROM pg_tables
WHERE tablename = 'uploaded_files';

-- 3. Check policies
SELECT 'Policy Check' as test,
  COUNT(*)::text || ' policies found (need 4)' as result
FROM pg_policies
WHERE tablename = 'uploaded_files';

-- 4. Check test user exists
SELECT 'User Check' as test,
  CASE WHEN EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'test@example.com'
  ) THEN '✅ Test user exists'
  ELSE '❌ Test user NOT found'
  END as result;

-- 5. List all policies
SELECT 'Policies' as test, policyname as result
FROM pg_policies
WHERE tablename = 'uploaded_files';
```

---

## 📞 Next Steps

After running through these checks, let me know:

1. ✅ Which checks passed
2. ❌ Which checks failed
3. 📋 Output of the diagnostic script
4. 🖥️ Any console logs from the upload attempt

This will help us pinpoint the exact issue!
