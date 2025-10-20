# Test User Setup & Verification

## Issue Found

❌ Test user doesn't exist in `auth.users` table

## Step 1: Create Test User in Supabase

You have two options:

### Option A: Via API (Recommended)

Make sure your backend is running, then:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "name": "Test User"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "abc-123-def-456...",
    "email": "test@example.com"
  }
}
```

### Option B: Directly in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - Email: `test@example.com`
   - Password: `Test123456!`
   - Auto Confirm User: ✅ **Check this** (important!)
4. Click **"Create user"**

---

## Step 2: Get User ID

Run this in **Supabase SQL Editor**:

```sql
-- Get your test user's ID
SELECT
  id,
  email,
  created_at,
  email_confirmed_at,
  confirmed_at
FROM auth.users
WHERE email = 'test@example.com';
```

**Copy the `id` value** - you'll need it for the next steps.

---

## Step 3: Test Manual Insert (Verify RLS Policies)

Replace `YOUR-USER-ID-HERE` with the actual UUID from Step 2:

```sql
-- Test manual insert with REAL user ID
INSERT INTO uploaded_files (
  filename,
  file_path,
  file_size,
  mime_type,
  public_url,
  user_id,
  status
) VALUES (
  'test.jpg',
  'images/test.jpg',
  1000,
  'image/jpeg',
  'https://test.com/test.jpg',
  'PASTE-YOUR-USER-ID-HERE',  -- ← Replace with actual UUID from Step 2
  'uploaded'
);
```

**Expected Result:** ✅ Row inserted successfully

**If it fails with RLS error:** The RLS policies might not be working. Run this to check:

```sql
-- Verify auth.uid() returns your user ID
-- (This won't work in SQL Editor without JWT, but good to know)
SELECT auth.uid();
```

---

## Step 4: Get JWT Token for API Testing

Login to get a JWT token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "user": {
      "id": "abc-123-...",
      "email": "test@example.com"
    }
  }
}
```

**Copy the `access_token`** - this is your JWT token.

---

## Step 5: Test Upload & Analyze

Now test the actual upload endpoint:

```bash
# Replace YOUR_JWT_TOKEN with the access_token from Step 4
curl -X POST http://localhost:3000/api/upload/upload-and-analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/your/test-image.jpg"
```

**Example with actual file:**

```bash
# Windows (PowerShell)
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X POST http://localhost:3000/api/upload/upload-and-analyze `
  -H "Authorization: Bearer $token" `
  -F "image=@C:\Users\YourName\Pictures\test.jpg"

# Mac/Linux
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X POST http://localhost:3000/api/upload/upload-and-analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/Users/yourname/Pictures/test.jpg"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Image uploaded and analyzed successfully",
  "data": {
    "id": 123,
    "filename": "test.jpg",
    "public_url": "https://...supabase.co/storage/v1/object/public/uploads/images/{user_id}/test.jpg",
    "analysis": {
      "description": "A beautiful sunset...",
      "tags": ["sunset", "nature", "sky"],
      "captions": {
        "short": "Sunset view",
        "medium": "A stunning sunset over the horizon",
        "long": "A breathtaking sunset..."
      }
    }
  }
}
```

---

## Step 6: Verify in Database

Check if the file was saved with your user_id:

```sql
-- Check uploaded files for your user
SELECT
  id,
  filename,
  user_id,
  status,
  description,
  tags,
  created_at
FROM uploaded_files
WHERE user_id = 'YOUR-USER-ID-HERE'  -- Replace with your user ID
ORDER BY created_at DESC
LIMIT 5;
```

---

## Common Issues

### Issue 1: "Email already exists"

If you get this error when signing up, the user already exists. Just skip to Step 4 (get JWT token).

### Issue 2: "Invalid login credentials"

Your password might be wrong. Reset it:

```sql
-- Reset password directly in Supabase SQL Editor
UPDATE auth.users
SET encrypted_password = crypt('Test123456!', gen_salt('bf'))
WHERE email = 'test@example.com';
```

Then try logging in again.

### Issue 3: Email confirmation required

If signup works but login fails with "Email not confirmed":

```sql
-- Manually confirm email
UPDATE auth.users
SET
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'test@example.com';
```

### Issue 4: Still getting RLS error after all this

Try temporarily disabling RLS to isolate the issue:

```sql
-- TEMPORARILY disable RLS
ALTER TABLE uploaded_files DISABLE ROW LEVEL SECURITY;

-- Test upload again...

-- Then re-enable
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
```

If it works with RLS disabled, the issue is with the policies. The most common cause is that `auth.uid()` is returning `NULL` because the JWT token isn't being passed correctly.

---

## Debugging Checklist

After creating the user:

- [ ] User exists in `auth.users` table (Step 2 query returns a row)
- [ ] User is confirmed (`confirmed_at` is not NULL)
- [ ] Login returns a valid JWT token
- [ ] Manual INSERT with user_id works in SQL Editor
- [ ] Upload endpoint accepts the JWT token (no 401 error)
- [ ] Upload endpoint successfully creates file in database
- [ ] File row has correct `user_id` value

---

## Next Steps

1. **Create test user** (Step 1)
2. **Get user ID** (Step 2)
3. **Test manual insert** (Step 3) - verify RLS works
4. **Get JWT token** (Step 4)
5. **Test upload API** (Step 5) - the real test!

Share the results and any errors you encounter!
