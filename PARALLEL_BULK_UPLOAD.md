# Parallel Bulk Upload & Analysis

## What Changed

The `/api/upload/bulk-upload-and-analyze` endpoint now processes **multiple images in parallel** for significantly faster performance! 🚀

---

## Key Improvements

### ✅ Before (Sequential Processing)

```
Image 1: Upload → Save → Analyze (5s)
Image 2: Upload → Save → Analyze (5s)
Image 3: Upload → Save → Analyze (5s)
Total: ~15 seconds
```

### ✅ After (Parallel Processing)

```
Image 1: Upload → Save → Analyze ┐
Image 2: Upload → Save → Analyze ├─ All at once!
Image 3: Upload → Save → Analyze ┘
Total: ~5 seconds (3x faster!)
```

---

## New Features

✅ **Parallel Processing** - All images processed simultaneously  
✅ **Increased Limit** - Up to 10 images per request (was 3)  
✅ **Performance Metrics** - Response includes processing time  
✅ **Better Logging** - Detailed console output for each image  
✅ **camelCase Response** - Consistent naming convention

---

## API Endpoint

**URL:** `POST /api/upload/bulk-upload-and-analyze`

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Field Name:** `images` (multiple files)

**Max Files:** 10 images per request

**Max Size:** 10MB per image

---

## Request Example

### Postman Setup

1. **Method:** `POST`
2. **URL:** `http://localhost:3000/api/upload/bulk-upload-and-analyze`
3. **Headers:**
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```
4. **Body:** `form-data`
   - Key: `images` (File type)
   - Select multiple files (up to 10)

### cURL Example

```bash
curl -X POST \
  http://localhost:3000/api/upload/bulk-upload-and-analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg"
```

### JavaScript Example

```javascript
async function bulkUploadImages(files) {
  const token = localStorage.getItem("accessToken");
  const formData = new FormData();

  // Add multiple files
  files.forEach((file) => {
    formData.append("images", file);
  });

  const response = await fetch("/api/upload/bulk-upload-and-analyze", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (data.success) {
    console.log(
      `✅ Processed ${data.data.successfulUploads} images in ${data.data.processingTimeSeconds}s`
    );
    console.log("Results:", data.data.results);
  }

  return data;
}
```

### React Example

```javascript
import { useState } from "react";

function BulkImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) {
      alert("Please select at least one image");
      return;
    }

    if (files.length > 10) {
      alert("Maximum 10 images allowed");
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch("/api/upload/bulk-upload-and-analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data);
        alert(
          `✅ Uploaded ${data.data.successfulUploads} images in ${data.data.processingTimeSeconds}s!`
        );
      } else {
        alert(`❌ Upload failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        disabled={uploading}
      />

      {uploading && <p>⏳ Processing images in parallel...</p>}

      {results && (
        <div>
          <h3>✅ Results</h3>
          <p>
            Processed {results.successfulUploads} of {results.totalAttempts}{" "}
            images in {results.processingTimeSeconds}s
          </p>

          {results.results.map((result) => (
            <div key={result.id}>
              <h4>{result.filename}</h4>
              <p>{result.description}</p>
              <p>Tags: {result.tags.join(", ")}</p>
              <img src={result.publicUrl} alt={result.filename} width="200" />
            </div>
          ))}

          {results.errors.length > 0 && (
            <div>
              <h4>❌ Errors</h4>
              {results.errors.map((error, i) => (
                <p key={i}>
                  {error.filename}: {error.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Response Format

### Success Response (200 OK)

All images processed successfully:

```json
{
  "success": true,
  "message": "Processed 3 of 3 images in 5.23s",
  "data": {
    "successfulUploads": 3,
    "totalAttempts": 3,
    "processingTimeSeconds": 5.23,
    "results": [
      {
        "id": 123,
        "filename": "image1.jpg",
        "size": 245678,
        "type": "image/jpeg",
        "path": "images/user-id/1234567890-abc123-0.jpg",
        "publicUrl": "https://...supabase.co/.../image1.jpg",
        "description": "A beautiful sunset over the ocean",
        "tags": ["sunset", "ocean", "nature", "beach", "sky"],
        "status": "completed",
        "uploadedAt": "2025-10-20T16:00:00.000Z",
        "analyzedAt": "2025-10-20T16:00:05.123Z",
        "analysis": {
          "success": true,
          "error": null
        }
      },
      {
        "id": 124,
        "filename": "image2.jpg",
        "size": 189456,
        "type": "image/jpeg",
        "path": "images/user-id/1234567890-def456-1.jpg",
        "publicUrl": "https://...supabase.co/.../image2.jpg",
        "description": "A cute puppy playing in the park",
        "tags": ["dog", "puppy", "park", "pet", "animal"],
        "status": "completed",
        "uploadedAt": "2025-10-20T16:00:00.000Z",
        "analyzedAt": "2025-10-20T16:00:05.234Z",
        "analysis": {
          "success": true,
          "error": null
        }
      },
      {
        "id": 125,
        "filename": "image3.jpg",
        "size": 312890,
        "type": "image/jpeg",
        "path": "images/user-id/1234567890-ghi789-2.jpg",
        "publicUrl": "https://...supabase.co/.../image3.jpg",
        "description": "A delicious pizza with various toppings",
        "tags": ["pizza", "food", "italian", "cheese", "dinner"],
        "status": "completed",
        "uploadedAt": "2025-10-20T16:00:00.000Z",
        "analyzedAt": "2025-10-20T16:00:05.345Z",
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

---

### Partial Success Response (207 Multi-Status)

Some images succeeded, some failed:

```json
{
  "success": true,
  "message": "Processed 2 of 3 images in 5.12s",
  "data": {
    "successfulUploads": 2,
    "totalAttempts": 3,
    "processingTimeSeconds": 5.12,
    "results": [
      {
        "id": 123,
        "filename": "image1.jpg",
        "description": "A beautiful sunset",
        "tags": ["sunset", "nature"],
        "status": "completed",
        ...
      },
      {
        "id": 124,
        "filename": "image2.jpg",
        "description": "A cute puppy",
        "tags": ["dog", "pet"],
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

---

### Error Response (500 Internal Server Error)

All images failed:

```json
{
  "success": false,
  "message": "Processed 0 of 3 images in 2.34s",
  "data": {
    "successfulUploads": 0,
    "totalAttempts": 3,
    "processingTimeSeconds": 2.34,
    "results": [],
    "errors": [
      {
        "filename": "image1.jpg",
        "error": "Processing failed: Storage upload failed"
      },
      {
        "filename": "image2.jpg",
        "error": "Processing failed: Database save failed"
      },
      {
        "filename": "image3.jpg",
        "error": "Processing failed: File too large"
      }
    ]
  }
}
```

---

### Validation Errors (400 Bad Request)

**No files provided:**

```json
{
  "success": false,
  "error": "No image files provided",
  "message": "Please upload at least one image file"
}
```

**Too many files:**

```json
{
  "success": false,
  "error": "Maximum 10 images allowed per request",
  "message": "You can upload up to 10 images at once"
}
```

---

## Console Output

Server logs show detailed progress for each image:

```
📤 User test@example.com uploading 3 images...
⚡ Processing 3 images in parallel...
  📤 [1/3] Uploading sunset.jpg...
  📤 [2/3] Uploading puppy.jpg...
  📤 [3/3] Uploading pizza.jpg...
  💾 [1/3] Saving sunset.jpg to database...
  💾 [2/3] Saving puppy.jpg to database...
  💾 [3/3] Saving pizza.jpg to database...
  🤖 [1/3] Analyzing sunset.jpg with AI...
  🤖 [2/3] Analyzing puppy.jpg with AI...
  🤖 [3/3] Analyzing pizza.jpg with AI...
  ✅ [1/3] Completed sunset.jpg
  ✅ [2/3] Completed puppy.jpg
  ✅ [3/3] Completed pizza.jpg
⚡ Completed 3/3 images in 5.23s
```

---

## Performance Comparison

### Sequential (Old)

- **1 image:** ~5 seconds
- **3 images:** ~15 seconds
- **10 images:** ~50 seconds

### Parallel (New)

- **1 image:** ~5 seconds
- **3 images:** ~5-7 seconds (2-3x faster)
- **10 images:** ~5-10 seconds (5-10x faster)

🚀 **Performance gain increases with more images!**

---

## Important Notes

### Rate Limits

- **OpenAI API:** Be aware of your OpenAI API rate limits
- **Supabase:** Check your Supabase plan limits
- **Recommended:** Start with 3-5 images, then increase

### Memory Usage

- Each image is held in memory during processing
- Uploading 10 large images (10MB each) = ~100MB RAM
- Ensure your server has sufficient memory

### Error Handling

- ✅ Individual failures don't block other images
- ✅ Partial success returns 207 Multi-Status
- ✅ All failures return 500 with error details
- ✅ Each error includes filename and reason

### Timeout Considerations

- Default timeout may be too short for 10 large images
- Consider increasing timeout for large bulk uploads
- Recommended: 60-120 seconds for 10 images

---

## Testing

### Test with 1 Image

```bash
curl -X POST \
  http://localhost:3000/api/upload/bulk-upload-and-analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@test.jpg"
```

Expected: ~5 seconds

---

### Test with 3 Images

```bash
curl -X POST \
  http://localhost:3000/api/upload/bulk-upload-and-analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@test1.jpg" \
  -F "images=@test2.jpg" \
  -F "images=@test3.jpg"
```

Expected: ~5-7 seconds (vs ~15 seconds sequential)

---

### Test with 10 Images

```bash
curl -X POST \
  http://localhost:3000/api/upload/bulk-upload-and-analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@img1.jpg" \
  -F "images=@img2.jpg" \
  -F "images=@img3.jpg" \
  -F "images=@img4.jpg" \
  -F "images=@img5.jpg" \
  -F "images=@img6.jpg" \
  -F "images=@img7.jpg" \
  -F "images=@img8.jpg" \
  -F "images=@img9.jpg" \
  -F "images=@img10.jpg"
```

Expected: ~5-10 seconds (vs ~50 seconds sequential)

---

## Troubleshooting

### Issue: "Request Entity Too Large"

**Solution:** Reduce image sizes or number of images

```javascript
// Compress images before upload
const compressedFile = await compressImage(file, { maxSizeMB: 2 });
```

---

### Issue: OpenAI Rate Limit Exceeded

**Solution:** Reduce concurrent uploads or upgrade OpenAI plan

```
Error: "Rate limit exceeded for requests"
```

---

### Issue: Timeout on Large Uploads

**Solution:** Increase server timeout

```javascript
// server.js
app.use(timeout("120s")); // 2 minutes
```

---

## Summary

**What Changed:**

- ✅ Images now process **in parallel** (simultaneously)
- ✅ Increased limit from **3 to 10 images**
- ✅ Added **performance metrics** in response
- ✅ Better **console logging** with progress indicators
- ✅ Updated to **camelCase** response format

**Performance:**

- ✅ **3x faster** for 3 images
- ✅ **5-10x faster** for 10 images
- ✅ Speed scales with number of images

**Files Updated:**

- `routes/upload.js` - Parallel processing implementation

---

Ready to upload multiple images at lightning speed! ⚡🚀
