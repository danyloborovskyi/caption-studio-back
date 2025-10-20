# Testing Upload & Analyze with Postman

## Step 1: Login to Get JWT Token

### Request Setup

- **Method:** `POST`
- **URL:** `http://localhost:3000/api/auth/login`

### Headers

- **Key:** `Content-Type`
- **Value:** `application/json`

### Body

1. Select **Body** tab
2. Select **raw**
3. Select **JSON** from dropdown
4. Paste this:

```json
{
  "email": "test@example.com",
  "password": "YOUR_PASSWORD_HERE"
}
```

### Click **Send**

### Expected Response

```json
{
  "success": true,
  "message": "Login successful",
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwi...",
    "refresh_token": "...",
    "expires_in": 3600,
    "user": {
      "id": "8ab3d05d-92db-4ca7-857a-51ca102e5016",
      "email": "test@example.com",
      "email_confirmed": true
    }
  }
}
```

**📋 COPY the `access_token` value** - you'll need it for the next request!

---

## Step 2: Upload and Analyze Image

### Request Setup

- **Method:** `POST`
- **URL:** `http://localhost:3000/api/upload/upload-and-analyze`

### Headers

Add this header:

- **Key:** `Authorization`
- **Value:** `Bearer YOUR_ACCESS_TOKEN_HERE`

  ⚠️ **Important:** Include the word "Bearer" followed by a space, then paste your token!

  Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Body

1. Select **Body** tab
2. Select **form-data** (not raw!)
3. Add a new key:
   - **Key:** `image`
   - **Type:** Change from "Text" to **File** (hover over the key field, you'll see a dropdown)
   - **Value:** Click "Select Files" and choose a JPG or PNG image from your computer

### Click **Send**

### Expected Success Response

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
      "description": "AI-generated description of your image",
      "tags": ["tag1", "tag2", "tag3"],
      "captions": {
        "short": "Short caption",
        "medium": "Medium length caption",
        "long": "Detailed long caption"
      }
    },
    "created_at": "2025-10-20T12:34:56.789Z"
  }
}
```

---

## Visual Guide for Postman

### Login Request

```
┌─────────────────────────────────────────────┐
│ POST  http://localhost:3000/api/auth/login  │
├─────────────────────────────────────────────┤
│ Headers                                      │
│   Content-Type: application/json            │
├─────────────────────────────────────────────┤
│ Body (raw, JSON)                            │
│   {                                         │
│     "email": "test@example.com",            │
│     "password": "YOUR_PASSWORD"             │
│   }                                         │
└─────────────────────────────────────────────┘
```

### Upload Request

```
┌───────────────────────────────────────────────────────────┐
│ POST  http://localhost:3000/api/upload/upload-and-analyze │
├───────────────────────────────────────────────────────────┤
│ Headers                                                    │
│   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...          │
├───────────────────────────────────────────────────────────┤
│ Body (form-data)                                          │
│   image: [File] your-image.jpg                            │
└───────────────────────────────────────────────────────────┘
```

---

## Common Errors & Solutions

### ❌ Error: "No authentication token provided"

**Cause:** Authorization header missing or malformed

**Fix:**

- Make sure you added the `Authorization` header
- Check it says: `Bearer YOUR_TOKEN` (with space after "Bearer")
- Don't forget the word "Bearer"!

### ❌ Error: "Invalid or expired token"

**Cause:** Token is wrong, expired, or from wrong user

**Fix:**

- Go back to Step 1 and login again to get a fresh token
- Tokens typically expire after 1 hour
- Make sure you copied the entire token (they're very long!)

### ❌ Error: "No file uploaded"

**Cause:** Image not attached correctly

**Fix:**

- Make sure you selected **form-data** (not raw or x-www-form-urlencoded)
- Make sure the key is named exactly `image`
- Make sure you changed the type to **File** (not Text)
- Click "Select Files" and choose an image

### ❌ Error: "new row violates row-level security policy"

**Cause:** RLS issue with JWT token

**Fix:**

- This means the token isn't being recognized by Supabase
- Check your server console - does it show the token being set?
- Verify your `.env` has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### ❌ Error: "OpenAI API error"

**Cause:** OpenAI API key missing or invalid

**Fix:**

- Check your `.env` file has: `OPENAI_API_KEY=sk-...`
- Make sure the key is valid
- You can temporarily comment out the OpenAI call to test just the upload

### ❌ Error: "File too large"

**Cause:** Image exceeds 10MB limit

**Fix:**

- Try a smaller image
- Or increase the limit in `routes/upload.js`:
  ```javascript
  limits: {
    fileSize: 20 * 1024 * 1024;
  } // 20MB
  ```

---

## Pro Tips for Postman

### Tip 1: Save Your Token as a Variable

1. After login, click on the response
2. Go to **Tests** tab
3. Add this script:

```javascript
pm.test("Save token", function () {
  var jsonData = pm.response.json();
  pm.environment.set("auth_token", jsonData.session.access_token);
});
```

4. Now in your upload request, use: `Bearer {{auth_token}}`

### Tip 2: Create a Collection

1. Create a new collection called "Caption Studio"
2. Add both requests (Login and Upload)
3. Save them for future testing

### Tip 3: Environment Setup

1. Create an environment called "Development"
2. Add variables:
   - `base_url`: `http://localhost:3000`
   - `auth_token`: (will be set automatically from script above)
3. Use `{{base_url}}` in your URLs

---

## Verify Upload in Database

After successful upload, check in **Supabase SQL Editor**:

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

You should see your uploaded image!

---

## Check Server Console

When you upload, your Node.js server console should log:

```
🔑 Auth middleware - Token set: YES eyJhbGci...
👤 User ID: 8ab3d05d-92db-4ca7-857a-51ca102e5016
📧 User Email: test@example.com
🔑 User Token: eyJhbGci...
```

If you don't see these logs, the auth middleware might not be working.

---

## Testing Checklist

- [ ] Step 1: Login request returns `access_token`
- [ ] Step 2: Copied token to Authorization header
- [ ] Step 3: Changed Body type to `form-data`
- [ ] Step 4: Key named `image`, type set to `File`
- [ ] Step 5: Selected an image file (JPG/PNG)
- [ ] Step 6: Upload returns success with analysis data
- [ ] Step 7: File visible in Supabase database
- [ ] Step 8: File accessible via `public_url`

---

Ready to test? Let me know what response you get! 🚀
