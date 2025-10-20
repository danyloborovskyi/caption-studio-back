# Test Upload API - Quick Guide

## ✅ Manual Insert Worked!

Your database is configured correctly. Now let's test the actual API.

---

## Step 1: Verify the Test Record

Check if the manual insert is visible:

```sql
SELECT
  id,
  filename,
  user_id,
  status,
  created_at
FROM uploaded_files
WHERE user_id = '8ab3d05d-92db-4ca7-857a-51ca102e5016'
ORDER BY created_at DESC;
```

You should see your test.jpg file.

---

## Step 2: Get JWT Token

Make sure your backend server is running, then login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"YOUR_PASSWORD\"}"
```

**Response will look like:**

```json
{
  "success": true,
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOi...",
    "user": {
      "id": "8ab3d05d-92db-4ca7-857a-51ca102e5016",
      "email": "test@example.com"
    }
  }
}
```

**Copy the `access_token` value.**

---

## Step 3: Test Upload & Analyze Endpoint

### Option A: Using PowerShell (Windows)

```powershell
# Set your token
$token = "PASTE_YOUR_ACCESS_TOKEN_HERE"

# Test with a real image file (update the path)
curl -X POST http://localhost:3000/api/upload/upload-and-analyze `
  -H "Authorization: Bearer $token" `
  -F "image=@C:\Users\danil\Pictures\test.jpg"
```

### Option B: Using cURL (if you have it)

```bash
TOKEN="PASTE_YOUR_ACCESS_TOKEN_HERE"
curl -X POST http://localhost:3000/api/upload/upload-and-analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@C:/Users/danil/Pictures/test.jpg"
```

### Option C: Using Postman

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/upload/upload-and-analyze`
3. **Headers:**
   - Key: `Authorization`
   - Value: `Bearer YOUR_ACCESS_TOKEN_HERE`
4. **Body:**
   - Select `form-data`
   - Key: `image` (change type to `File`)
   - Value: Select a JPG/PNG file from your computer
5. Click **Send**

---

## Expected Success Response

```json
{
  "success": true,
  "message": "Image uploaded and analyzed successfully",
  "data": {
    "id": 2,
    "filename": "your-image.jpg",
    "file_path": "images/8ab3d05d-92db-4ca7-857a-51ca102e5016/your-image.jpg",
    "public_url": "https://xxxxx.supabase.co/storage/v1/object/public/uploads/images/8ab3d05d-92db-4ca7-857a-51ca102e5016/your-image.jpg",
    "file_size": 245678,
    "mime_type": "image/jpeg",
    "user_id": "8ab3d05d-92db-4ca7-857a-51ca102e5016",
    "status": "analyzed",
    "analysis": {
      "description": "A description from OpenAI Vision",
      "tags": ["tag1", "tag2", "tag3"],
      "captions": {
        "short": "Short caption",
        "medium": "Medium length caption",
        "long": "Detailed long caption"
      }
    },
    "created_at": "2025-10-20T..."
  }
}
```

---

## Verify in Database

After successful upload, check the database:

```sql
SELECT
  id,
  filename,
  user_id,
  status,
  description,
  tags,
  public_url,
  created_at
FROM uploaded_files
WHERE user_id = '8ab3d05d-92db-4ca7-857a-51ca102e5016'
ORDER BY created_at DESC
LIMIT 5;
```

You should see both:

1. The manual test.jpg (status: 'uploaded')
2. Your new uploaded image (status: 'analyzed')

---

## Check Your Server Console

When you upload, your server console should show:

```
🔑 Auth middleware - Token set: YES eyJhbGciOiJIUzI1NiIsInR5cCI...
👤 User ID: 8ab3d05d-92db-4ca7-857a-51ca102e5016
📧 User Email: test@example.com
🔑 User Token: eyJhbGciOiJIUzI1NiIsInR5cCI...
```

---

## Possible Issues

### Issue 1: "No authentication token provided"

**Problem:** Token not in Authorization header  
**Fix:** Make sure you're using: `Authorization: Bearer YOUR_TOKEN` (note "Bearer " prefix)

### Issue 2: "Invalid or expired token"

**Problem:** Token is wrong or expired  
**Fix:** Login again to get a fresh token (tokens typically expire after 1 hour)

### Issue 3: "OpenAI API error"

**Problem:** OpenAI API key missing or invalid  
**Fix:** Check your `.env` file has `OPENAI_API_KEY=sk-...`

### Issue 4: Still getting RLS error

**Problem:** JWT token not being passed to Supabase correctly  
**Fix:** Check your `routes/upload.js` - make sure you're using:

```javascript
const supabase = getSupabaseClient(req.token);
```

And verify `getSupabaseClient` function exists:

```javascript
function getSupabaseClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
```

---

## Quick Test Summary

1. ✅ **Manual insert worked** - Database is configured correctly
2. 🔄 **Login** - Get JWT token
3. 🔄 **Upload image** - Test the API endpoint
4. 🔄 **Check database** - Verify the file was saved
5. 🔄 **Check console logs** - Verify token is being set

---

Share your results! 🚀
