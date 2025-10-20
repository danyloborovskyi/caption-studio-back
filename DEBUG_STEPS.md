# Debugging Steps for RLS Issue

## Step 1: Test the Diagnostic Endpoint

First, let's verify your token works with Supabase.

**In Postman:**

1. Method: `GET`
2. URL: `http://localhost:3000/api/upload/test-auth`
3. Headers: `Authorization: Bearer YOUR_JWT_TOKEN`
4. Click **Send**

### Expected Success Response:

```json
{
  "success": true,
  "auth_middleware": {
    "user_id": "8ab3d05d-92db-4ca7-857a-51ca102e5016",
    "email": "test@example.com",
    "token_exists": true
  },
  "supabase_auth": {
    "user_id": "8ab3d05d-92db-4ca7-857a-51ca102e5016",
    "email": "test@example.com",
    "error": null
  },
  "supabase_db_query": {
    "success": true,
    "error": null
  },
  "diagnostic": {
    "token_in_middleware": true,
    "token_recognized_by_supabase": true,
    "tokens_match": true
  }
}
```

**If this fails**, it means the token isn't being recognized by Supabase at all.

---

## Step 2: Check Server Console Logs

### Restart your server:

```bash
# Stop the server (Ctrl+C)
# Start it again
npm start
# or
node server.js
```

### Make the test request again

You should see in your console:

```
🔑 Auth middleware - Token attached successfully
  User ID: 8ab3d05d-92db-4ca7-857a-51ca102e5016
  Email: test@example.com
  Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJhdWQiOi...

🔍 Testing auth with Supabase...
User ID: 8ab3d05d-92db-4ca7-857a-51ca102e5016
Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJhdWQiOi...
Supabase auth.getUser() result: { user: '8ab3d05d-92db-4ca7-857a-51ca102e5016', error: undefined }
```

---

## Step 3: Try Upload Again

Now try the upload-and-analyze endpoint again in Postman:

**In Postman:**

1. Method: `POST`
2. URL: `http://localhost:3000/api/upload/upload-and-analyze`
3. Headers: `Authorization: Bearer YOUR_JWT_TOKEN`
4. Body: `form-data`, Key: `image`, Type: `File`, Value: Select an image
5. Click **Send**

### Watch Server Console

You should see:

```
🔑 Auth middleware - Token attached successfully
  User ID: 8ab3d05d-92db-4ca7-857a-51ca102e5016
  Email: test@example.com
  Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI...

============================================================
🔍 DEBUG: Upload and Analyze Request
👤 User ID: 8ab3d05d-92db-4ca7-857a-51ca102e5016
📧 User Email: test@example.com
🔑 Token exists: true
🔑 Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJhdWQiOi...
============================================================
📤 User test@example.com uploading and analyzing image...
```

If you still get the RLS error after this, **share the exact console output** and we'll investigate further.

---

## Common Issues & Fixes

### Issue 1: Token not recognized by Supabase

**Symptoms:** The diagnostic endpoint shows `token_recognized_by_supabase: false`

**Possible causes:**

1. Wrong `SUPABASE_URL` in `.env`
2. Wrong `SUPABASE_ANON_KEY` in `.env`
3. JWT was issued by a different Supabase project

**Fix:**

1. Go to Supabase Dashboard → Settings → API
2. Copy your **Project URL** → Update `SUPABASE_URL` in `.env`
3. Copy your **anon public** key → Update `SUPABASE_ANON_KEY` in `.env`
4. **Restart your server**
5. Login again to get a fresh token
6. Test again

### Issue 2: auth.uid() returns NULL

**Symptoms:** Still getting RLS error even though token is recognized

**This is the tricky one.** The issue is that when using the Supabase JS client with RLS, the client needs to know about the authenticated session.

**Possible Fix - Try Service Key Temporarily:**

In `routes/upload.js`, find line 10 and temporarily change it:

```javascript
// OLD (line 10):
function getSupabaseClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {

// NEW (TEMPORARY - for testing only):
function getSupabaseClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
```

**Test again.** If this works:

- ✅ Your code is correct
- ❌ The issue is with how RLS policies check `auth.uid()`

If using SERVICE_KEY works, it means the RLS policies need adjustment because the anon key + JWT header approach isn't setting the auth context properly.

### Issue 3: RLS Policies need adjustment

If service key works but anon key doesn't, try this SQL in Supabase:

```sql
-- Create a more permissive INSERT policy for testing
DROP POLICY IF EXISTS "Users can insert own files" ON uploaded_files;

CREATE POLICY "Users can insert own files"
ON uploaded_files
FOR INSERT
TO authenticated  -- This is important!
WITH CHECK (auth.uid() = user_id);
```

The `TO authenticated` part ensures the policy applies to authenticated users.

---

## Nuclear Option: Temporarily Disable RLS

**ONLY FOR TESTING** - to isolate the issue:

```sql
-- Disable RLS temporarily
ALTER TABLE uploaded_files DISABLE ROW LEVEL SECURITY;
```

Test your upload. If it works with RLS disabled, we know for sure the issue is with RLS policies, not your code.

**Don't forget to re-enable:**

```sql
-- Re-enable RLS
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
```

---

## Next Steps

Run these tests and share:

1. ✅/❌ Diagnostic endpoint result (`/test-auth`)
2. 📝 Server console logs
3. ✅/❌ Upload endpoint result
4. 📝 Any error messages

This will help us figure out exactly where the issue is! 🔍
