# Testing SSE Bulk Upload with Postman

## 🎯 Quick Test Guide

### Prerequisites

- ✅ Server running on `http://localhost:3000`
- ✅ Valid user account (signup if needed)
- ✅ 2-3 test images ready

---

## Step 1: Login and Get Access Token

**Request**:

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```

**Body**:

```json
{
  "email": "danilborovskii199911@gmail.com",
  "password": "your_password"
}
```

**Copy the `accessToken` from the response** (you'll need it for the next steps).

---

## Step 2: Start Bulk Upload

**Request**:

```
POST http://localhost:3000/api/upload/bulk-upload-and-analyze
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**Body** (form-data):

- Key: `images`, Type: `File`, Value: Select 2-3 image files
- Key: `tagStyle`, Type: `Text`, Value: `neutral` (optional)

**Expected Response** (immediate):

```json
{
  "success": true,
  "message": "Upload started",
  "data": {
    "uploadId": "a1b2c3d4e5f6...",
    "totalFiles": 3
  }
}
```

**⭐ Copy the `uploadId`** - you'll use it in the next step!

---

## Step 3: Connect to SSE Progress Stream

### Option A: Browser Console (Recommended)

Open your browser's Developer Console (F12) and run:

```javascript
// Replace with your actual values
const uploadId = "a1b2c3d4e5f6..."; // From Step 2
const accessToken = "eyJhbGci..."; // From Step 1

const eventSource = new EventSource(
  `http://localhost:3000/api/upload/progress/${uploadId}?token=${accessToken}`
);

console.log("🔌 Connecting to SSE...");

eventSource.onopen = () => {
  console.log("✅ Connected!");
};

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`📡 ${data.type.toUpperCase()}:`, data.data);

  if (data.type === "progress") {
    console.log(`   Progress: ${data.data.percentage}%`);
    console.log(
      `   Files:`,
      data.data.files.map((f) => `${f.filename}: ${f.status}`)
    );
  }

  if (data.type === "complete") {
    console.log("🎉 Upload Complete!");
    console.log(`   Duration: ${data.data.durationSeconds}s`);
    console.log(`   Successful: ${data.data.results.length}`);
    console.log(`   Failed: ${data.data.errors.length}`);
    eventSource.close();
  }
};

eventSource.onerror = (error) => {
  console.error("❌ SSE Error:", error);
  console.log("Status:", eventSource.readyState);
  eventSource.close();
};

// To stop manually:
// eventSource.close();
```

### Option B: Postman (Limited SSE Support)

Postman has limited SSE support, but you can try:

**Request**:

```
GET http://localhost:3000/api/upload/progress/YOUR_UPLOAD_ID?token=YOUR_ACCESS_TOKEN
```

**Note**: Postman may not display real-time events properly. Use browser console for best results.

---

## Step 4: Verify Files Were Saved

**Request**:

```
GET http://localhost:3000/api/files
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 123,
        "filename": "image1.jpg",
        "mimeType": "image/jpeg",
        "publicUrl": "https://...",
        "description": "AI-generated description...",
        "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
        "hasAiAnalysis": true,
        "isImage": true,
        "uploadedAt": "2025-10-21T...",
        ...
      }
    ],
    "pagination": {...}
  }
}
```

**✅ Verify**:

- Files appear in the list
- `description` and `tags` are populated (AI analysis complete)
- All fields are in `camelCase` format

---

## 📊 Expected SSE Event Sequence

### 1. Connected Event (immediate)

```json
{
  "type": "connected",
  "data": {
    "uploadId": "abc123",
    "total": 3,
    "completed": 0,
    "failed": 0,
    "processing": 3,
    "percentage": 0,
    "files": [
      { "filename": "image1.jpg", "status": "pending" },
      { "filename": "image2.jpg", "status": "pending" },
      { "filename": "image3.jpg", "status": "pending" }
    ]
  }
}
```

### 2. Progress Events (as files process)

```json
{
  "type": "progress",
  "data": {
    "uploadId": "abc123",
    "total": 3,
    "completed": 0,
    "failed": 0,
    "processing": 3,
    "percentage": 0,
    "files": [
      { "filename": "image1.jpg", "status": "uploading" }, // Changed!
      { "filename": "image2.jpg", "status": "pending" },
      { "filename": "image3.jpg", "status": "pending" }
    ]
  }
}
```

```json
{
  "type": "progress",
  "data": {
    "uploadId": "abc123",
    "total": 3,
    "completed": 0,
    "failed": 0,
    "processing": 3,
    "percentage": 0,
    "files": [
      { "filename": "image1.jpg", "status": "saving" }, // Changed!
      { "filename": "image2.jpg", "status": "uploading" }, // Changed!
      { "filename": "image3.jpg", "status": "pending" }
    ]
  }
}
```

```json
{
  "type": "progress",
  "data": {
    "uploadId": "abc123",
    "total": 3,
    "completed": 0,
    "failed": 0,
    "processing": 3,
    "percentage": 0,
    "files": [
      { "filename": "image1.jpg", "status": "analyzing" }, // Changed!
      { "filename": "image2.jpg", "status": "saving" }, // Changed!
      { "filename": "image3.jpg", "status": "uploading" } // Changed!
    ]
  }
}
```

```json
{
  "type": "progress",
  "data": {
    "uploadId": "abc123",
    "total": 3,
    "completed": 1, // Increased!
    "failed": 0,
    "processing": 2,
    "percentage": 33, // Increased!
    "files": [
      {
        "filename": "image1.jpg",
        "status": "completed", // ✅ Done!
        "id": 123,
        "mimeType": "image/jpeg",
        "publicUrl": "https://...",
        "description": "A beautiful sunset over the ocean...",
        "tags": ["sunset", "ocean", "nature", "landscape", "sky"]
      },
      { "filename": "image2.jpg", "status": "analyzing" },
      { "filename": "image3.jpg", "status": "saving" }
    ]
  }
}
```

... more progress events as files complete ...

### 3. Complete Event (after ALL files finish)

```json
{
  "type": "complete",
  "data": {
    "uploadId": "abc123",
    "total": 3,
    "completed": 3,
    "failed": 0,
    "processing": 0,
    "percentage": 100,
    "durationSeconds": 15.23,
    "files": [...],
    "results": [
      {
        "id": 123,
        "filename": "image1.jpg",
        "size": 245678,
        "mimeType": "image/jpeg",
        "filePath": "images/user-id/image1.jpg",
        "publicUrl": "https://...",
        "description": "A beautiful sunset over the ocean...",
        "tags": ["sunset", "ocean", "nature", "landscape", "sky"],
        "status": "completed",
        "uploadedAt": "2025-10-21T12:34:56Z",
        "analyzedAt": "2025-10-21T12:35:11Z",
        "hasAiAnalysis": true,
        "isImage": true
      },
      // ... more results
    ],
    "errors": []
  }
}
```

---

## 🐛 Troubleshooting

### Error: 401 Unauthorized

**Problem**: Token is missing or invalid

**Solutions**:

1. Verify you're passing the token in the URL: `?token=YOUR_TOKEN`
2. Check if token is expired (tokens expire after 1 hour by default)
3. Login again to get a fresh token
4. Make sure there are no extra spaces in the token

---

### Error: 404 Upload session not found

**Problem**: `uploadId` is invalid or expired

**Solutions**:

1. Make sure you're using the `uploadId` from Step 2 response
2. Upload sessions expire after 5 seconds once completed
3. Start a new upload (Step 2) and immediately connect to SSE (Step 3)

---

### SSE Connection Never Opens

**Problem**: Network or CORS issues

**Solutions**:

1. Check server is running: `http://localhost:3000/health`
2. Check browser console for CORS errors
3. Try using `127.0.0.1:3000` instead of `localhost:3000`
4. Make sure your `.env` has `FRONTEND_URL=http://localhost:3000`

---

### Files Complete But No AI Analysis

**Problem**: OpenAI API key is missing or invalid

**Solutions**:

1. Check `.env` file has `OPENAI_API_KEY=sk-...`
2. Verify OpenAI API key is valid and has credits
3. Check server console for OpenAI errors
4. Files will still upload successfully, but `description` and `tags` will be null

---

### SSE Events Show snake_case Fields

**Problem**: Old code is still running

**Solutions**:

1. **Restart the server** (CRITICAL!)
2. Kill any old Node processes: `taskkill /F /IM node.exe` (Windows)
3. Clear browser cache
4. Hard refresh (Ctrl+Shift+R)

---

## ✅ Success Indicators

You know everything is working when:

- ✅ SSE connection opens without 401 error
- ✅ You receive "connected" event immediately
- ✅ You receive multiple "progress" events as files process
- ✅ File statuses change: `pending` → `uploading` → `saving` → `analyzing` → `completed`
- ✅ You receive "complete" event after all files finish
- ✅ All field names are in camelCase (`mimeType`, `filePath`, `durationSeconds`)
- ✅ Files appear in `GET /api/files` with descriptions and tags
- ✅ Console shows emojis: `📡`, `📤`, `🤖`, `✅`

---

## 🎉 Next Steps

Once SSE is working, you can:

1. **Test with Different File Counts**

   - Try 1 file (instant)
   - Try 5 files (parallel processing)
   - Try 10 files (max limit)

2. **Test Error Handling**

   - Upload non-image files (should fail gracefully)
   - Upload very large files (should exceed limit)
   - Disconnect SSE mid-upload (should handle gracefully)

3. **Test Tag Styles**

   - Set `tagStyle: "neutral"` in body (professional tags)
   - Set `tagStyle: "playful"` in body (fun tags)
   - Set `tagStyle: "seo"` in body (search-optimized tags)

4. **Integrate with Frontend**
   - Use the working SSE connection in your React/Vue/Angular app
   - Display real-time progress UI
   - Show individual file statuses

---

## 📞 Need Help?

If you're still having issues:

1. **Check Server Logs**

   - Look for error messages in the console
   - Search for red `❌` emojis

2. **Check Browser Console**

   - Look for network errors
   - Check EventSource readyState (0=connecting, 1=open, 2=closed)

3. **Verify Environment**

   - `.env` file has all required variables
   - Supabase is configured correctly
   - OpenAI API key is valid

4. **Review Documentation**
   - `SSE_FIXES_SUMMARY.md` - Complete technical details
   - `SETUP_COMPLETE.md` - Overall system setup
   - `README.md` - API documentation
