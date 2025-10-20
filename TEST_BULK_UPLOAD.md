# Testing Bulk Upload & Analyze

## Endpoint: POST `/api/upload/bulk-upload-and-analyze`

Uploads multiple images (up to 3) and analyzes each with AI.

---

## Setup in Postman

### 1. Get Your JWT Token

**Login first:**

```bash
POST http://localhost:3000/api/auth/login
{
  "email": "test@example.com",
  "password": "YOUR_PASSWORD"
}
```

Copy the `access_token`.

---

### 2. Configure Bulk Upload Request

**Method:** `POST`  
**URL:** `http://localhost:3000/api/upload/bulk-upload-and-analyze`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**

1. Select **form-data** (not raw!)
2. Add multiple files with the **same key name**:

| Key      | Type | Value          |
| -------- | ---- | -------------- |
| `images` | File | Select image 1 |
| `images` | File | Select image 2 |
| `images` | File | Select image 3 |

⚠️ **Important:**

- The key MUST be `images` (plural) for all files
- Type must be set to **File** (not Text)
- Maximum 3 images per request

### Visual Guide for Postman:

```
Body → form-data

Row 1:  images  [File ▼]  photo1.jpg
Row 2:  images  [File ▼]  photo2.jpg
Row 3:  images  [File ▼]  photo3.jpg
```

Click **Send**

---

## Expected Response

### Success (All 3 uploaded)

```json
{
  "success": true,
  "message": "Processed 3 of 3 images",
  "data": {
    "successful_uploads": 3,
    "total_attempts": 3,
    "results": [
      {
        "id": 136,
        "filename": "photo1.jpg",
        "size": 245000,
        "type": "image/jpeg",
        "path": "images/8ab3d05d-92db-4ca7-857a-51ca102e5016/1760978551534-abc123-0.jpg",
        "publicUrl": "https://...supabase.co/.../images/USER_ID/photo1.jpg",
        "description": "AI-generated description for photo 1",
        "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
        "status": "completed",
        "uploadedAt": "2025-10-20T17:00:00.000Z",
        "analyzedAt": "2025-10-20T17:00:05.000Z",
        "analysis": {
          "success": true,
          "error": null
        }
      },
      {
        "id": 137,
        "filename": "photo2.jpg",
        "size": 189000,
        "type": "image/jpeg",
        "path": "images/8ab3d05d-92db-4ca7-857a-51ca102e5016/1760978551534-def456-1.jpg",
        "publicUrl": "https://...supabase.co/.../images/USER_ID/photo2.jpg",
        "description": "AI-generated description for photo 2",
        "tags": ["nature", "landscape", "mountains", "sky", "scenic"],
        "status": "completed",
        "uploadedAt": "2025-10-20T17:00:00.000Z",
        "analyzedAt": "2025-10-20T17:00:08.000Z",
        "analysis": {
          "success": true,
          "error": null
        }
      },
      {
        "id": 138,
        "filename": "photo3.jpg",
        "size": 312000,
        "type": "image/jpeg",
        "path": "images/8ab3d05d-92db-4ca7-857a-51ca102e5016/1760978551534-ghi789-2.jpg",
        "publicUrl": "https://...supabase.co/.../images/USER_ID/photo3.jpg",
        "description": "AI-generated description for photo 3",
        "tags": ["architecture", "building", "urban", "city", "modern"],
        "status": "completed",
        "uploadedAt": "2025-10-20T17:00:00.000Z",
        "analyzedAt": "2025-10-20T17:00:12.000Z",
        "analysis": {
          "success": true,
          "error": null
        }
      }
    ],
    "errors": []
  }
}
```

**Status Code:** `200 OK`

---

### Partial Success (Some failed)

If some uploads succeed but others fail:

```json
{
  "success": true,
  "message": "Processed 2 of 3 images",
  "data": {
    "successful_uploads": 2,
    "total_attempts": 3,
    "results": [
      {
        "id": 136,
        "filename": "photo1.jpg",
        "status": "completed",
        ...
      },
      {
        "id": 137,
        "filename": "photo2.jpg",
        "status": "completed",
        ...
      }
    ],
    "errors": [
      {
        "filename": "corrupted.jpg",
        "error": "Processing failed: Invalid image format"
      }
    ]
  }
}
```

**Status Code:** `207 Multi-Status`

---

### All Failed

```json
{
  "success": false,
  "message": "All uploads failed",
  "data": {
    "successful_uploads": 0,
    "total_attempts": 3,
    "results": [],
    "errors": [
      {
        "filename": "file1.jpg",
        "error": "Processing failed: ..."
      },
      {
        "filename": "file2.jpg",
        "error": "Storage upload failed: ..."
      },
      {
        "filename": "file3.jpg",
        "error": "Database save failed: ..."
      }
    ]
  }
}
```

**Status Code:** `500 Internal Server Error`

---

## Common Errors

### ❌ Error: "Maximum 3 images allowed per request"

**Problem:** More than 3 images attached

**Fix:** Remove extra images, send only 3 or fewer

---

### ❌ Error: "No image files provided"

**Problem:** No files attached or wrong key name

**Fix:**

- Make sure files are attached
- Key must be exactly `images` (plural)
- Type must be set to **File**

---

### ❌ Error: "No authentication token provided"

**Problem:** Missing Authorization header

**Fix:** Add `Authorization: Bearer YOUR_JWT_TOKEN` header

---

### ❌ Error: "Only these image formats are supported: ..."

**Problem:** Invalid file format (e.g., trying to upload PDF, TXT, etc.)

**Fix:** Use only supported image formats:

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

---

### ❌ Error: "File too large"

**Problem:** Image exceeds 10MB limit

**Fix:** Compress the image or use a smaller file

---

## Server Console Output

When bulk upload runs, you'll see:

```
🔑 Auth middleware - Token attached successfully
  User ID: 8ab3d05d-92db-4ca7-857a-51ca102e5016
  Email: test@example.com

📤 User test@example.com uploading 3 images...

[Processing image 1/3: photo1.jpg]
✅ Uploaded to storage
✅ Saved to database
🤖 AI analysis complete

[Processing image 2/3: photo2.jpg]
✅ Uploaded to storage
✅ Saved to database
🤖 AI analysis complete

[Processing image 3/3: photo3.jpg]
✅ Uploaded to storage
✅ Saved to database
🤖 AI analysis complete

✅ Bulk upload complete: 3/3 successful
```

---

## How It Works

### Process Flow:

1. **Authentication** - Verifies JWT token
2. **Validation** - Checks file count (max 3) and formats
3. **For each image:**
   - Generate unique filename with index: `timestamp-random-INDEX.ext`
   - Upload to Supabase Storage in user folder: `images/{user_id}/filename`
   - Save metadata to database with `user_id`
   - Call OpenAI Vision API for analysis
   - Update database with AI results
4. **Response** - Returns all results + any errors

### Key Features:

- ✅ **Parallel processing** - All images processed sequentially but efficiently
- ✅ **Partial success** - Returns successful uploads even if some fail
- ✅ **User isolation** - Each file stored in user's folder
- ✅ **Error handling** - Specific error for each failed image
- ✅ **AI analysis** - Automatic description and tags for each image

---

## Verify in Database

After bulk upload, check your database:

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
LIMIT 10;
```

You should see all 3 newly uploaded images!

---

## Check in Supabase Storage

1. Go to **Supabase Dashboard** → **Storage** → **uploads** bucket
2. Navigate to `images/{your_user_id}/`
3. You should see all 3 images stored there

---

## Performance Notes

### Upload Time:

- **Storage upload:** ~1-2 seconds per image
- **AI analysis:** ~3-5 seconds per image
- **Total for 3 images:** ~15-20 seconds

### Optimization Tips:

- Compress images before upload
- Use smaller images for faster analysis
- OpenAI Vision works best with < 2MB images

---

## Comparison: Single vs Bulk Upload

### Single Upload (`/upload-and-analyze`)

```
POST /api/upload/upload-and-analyze
Body: form-data
  - image: [File] single image
```

**Best for:** One image at a time

### Bulk Upload (`/bulk-upload-and-analyze`)

```
POST /api/upload/bulk-upload-and-analyze
Body: form-data
  - images: [File] image 1
  - images: [File] image 2
  - images: [File] image 3
```

**Best for:** Multiple images (2-3) at once

---

## Testing Checklist

- [ ] Upload 1 image (should work)
- [ ] Upload 2 images (should work)
- [ ] Upload 3 images (should work)
- [ ] Try to upload 4 images (should fail with "Maximum 3 images" error)
- [ ] Upload without authentication (should fail with 401)
- [ ] Upload invalid file type (should fail with format error)
- [ ] Check database for all uploaded files
- [ ] Verify all files have AI analysis
- [ ] Verify all files stored in user-specific folder
- [ ] Check that public URLs work

---

## Next: Test Bulk Analyze

After uploading, you can also test **bulk analysis** of existing images:

```
POST /api/upload/bulk-analyze
Headers: Authorization: Bearer YOUR_JWT_TOKEN
Body (JSON):
{
  "ids": [136, 137, 138]
}
```

This re-analyzes existing uploaded images (up to 3 at a time).

---

Ready to test? Try it in Postman! 🚀
