# Testing File Retrieval Endpoints

## Overview

Two main endpoints for retrieving files:

1. **GET `/api/files`** - Get all files for authenticated user
2. **GET `/api/files/:id`** - Get a single file by ID (ownership verified)

Both require authentication and automatically filter by user.

---

## Test 1: Get All Files for User

### Endpoint: GET `/api/files`

Returns all files uploaded by the authenticated user with pagination, sorting, and filtering.

### In Postman:

**Method:** `GET`  
**URL:** `http://localhost:3000/api/files`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Optional Query Parameters:**

```
?page=1                    # Page number (default: 1)
&limit=20                  # Items per page (default: 20)
&status=completed          # Filter by status (uploaded, processing, completed, failed)
&sortBy=uploaded_at        # Sort field (default: uploaded_at)
&sortOrder=desc            # Sort order (asc or desc, default: desc)
```

**Example URLs:**

```
# Get first page (20 items)
GET http://localhost:3000/api/files

# Get page 2 with 10 items
GET http://localhost:3000/api/files?page=2&limit=10

# Get only completed files
GET http://localhost:3000/api/files?status=completed

# Sort by filename ascending
GET http://localhost:3000/api/files?sortBy=filename&sortOrder=asc
```

### Expected Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 136,
      "filename": "peony.jpg",
      "file_path": "images/8ab3d05d-92db-4ca7-857a-51ca102e5016/1760978551534-yziuxe.jpg",
      "file_size": 244944,
      "mime_type": "image/jpeg",
      "public_url": "https://npguberkdninaucofupy.supabase.co/storage/v1/object/public/uploads/images/8ab3d05d-92db-4ca7-857a-51ca102e5016/1760978551534-yziuxe.jpg",
      "description": "A stunning bouquet of soft pink peonies...",
      "tags": ["peonies", "flowers", "bouquet", "pink", "nature"],
      "status": "completed",
      "uploaded_at": "2025-10-20T16:42:32.546Z",
      "updated_at": "2025-10-20T16:42:37.974Z",
      "file_size_mb": "0.23",
      "has_ai_analysis": true,
      "is_image": true
    },
    {
      "id": 135,
      "filename": "sunset.jpg",
      "file_path": "images/8ab3d05d-92db-4ca7-857a-51ca102e5016/1760978234567-abc123.jpg",
      "file_size": 512000,
      "mime_type": "image/jpeg",
      "public_url": "https://...supabase.co/.../sunset.jpg",
      "description": "A breathtaking sunset over the ocean...",
      "tags": ["sunset", "ocean", "sky", "nature", "scenic"],
      "status": "completed",
      "uploaded_at": "2025-10-20T16:30:15.123Z",
      "updated_at": "2025-10-20T16:30:20.456Z",
      "file_size_mb": "0.49",
      "has_ai_analysis": true,
      "is_image": true
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_items": 2,
    "total_pages": 1,
    "has_next_page": false,
    "has_prev_page": false,
    "next_page": null,
    "prev_page": null
  },
  "filters": {
    "status": "all",
    "sort_by": "uploaded_at",
    "sort_order": "desc"
  },
  "summary": {
    "total_files": 2,
    "page_count": 2,
    "files_with_ai": 2,
    "image_files": 2
  }
}
```

### Key Points:

- ✅ **Only YOUR files** - Other users' files are not visible
- ✅ **Computed fields** - `file_size_mb`, `has_ai_analysis`, `is_image`
- ✅ **Pagination** - Navigate through large file lists
- ✅ **Filtering** - Filter by status
- ✅ **Sorting** - Sort by any field

---

## Test 2: Get Single File by ID

### Endpoint: GET `/api/files/:id`

Returns detailed information about a specific file (must be owned by you).

### In Postman:

**Method:** `GET`  
**URL:** `http://localhost:3000/api/files/136` (replace 136 with actual file ID)

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**No query parameters needed.**

### Expected Response (Success):

```json
{
  "success": true,
  "data": {
    "id": 136,
    "filename": "peony.jpg",
    "file_path": "images/8ab3d05d-92db-4ca7-857a-51ca102e5016/1760978551534-yziuxe.jpg",
    "file_size": 244944,
    "mime_type": "image/jpeg",
    "public_url": "https://npguberkdninaucofupy.supabase.co/storage/v1/object/public/uploads/images/8ab3d05d-92db-4ca7-857a-51ca102e5016/1760978551534-yziuxe.jpg",
    "description": "A stunning bouquet of soft pink peonies showcases their delicate, rounded petals and lush greenery, creating a serene and romantic atmosphere.",
    "tags": ["peonies", "flowers", "bouquet", "pink", "nature"],
    "status": "completed",
    "uploaded_at": "2025-10-20T16:42:32.546Z",
    "updated_at": "2025-10-20T16:42:37.974Z",
    "file_size_mb": "0.23",
    "file_size_kb": "239.20",
    "has_ai_analysis": true,
    "is_image": true,
    "file_extension": "jpg"
  }
}
```

### Expected Response (Not Found / Not Owned):

If you try to access another user's file or non-existent file:

```json
{
  "success": false,
  "error": "File not found or access denied"
}
```

**Status Code:** `404 Not Found`

### Key Points:

- ✅ **Ownership verification** - Can only access YOUR files
- ✅ **More computed fields** - Includes `file_size_kb` and `file_extension`
- ✅ **Privacy protection** - Doesn't reveal if file exists for other users

---

## Test 3: Get Only Images

### Endpoint: GET `/api/files/images`

Returns only image files for the authenticated user.

### In Postman:

**Method:** `GET`  
**URL:** `http://localhost:3000/api/files/images`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:** (optional)

```
?page=1
&limit=20
&sortBy=uploaded_at
&sortOrder=desc
```

### Expected Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 136,
      "filename": "peony.jpg",
      "public_url": "https://...supabase.co/.../peony.jpg",
      "description": "A stunning bouquet...",
      "tags": ["peonies", "flowers", "bouquet", "pink", "nature"],
      "status": "completed",
      "file_size_mb": "0.23",
      "uploaded_at": "2025-10-20T16:42:32.546Z",
      "has_ai_analysis": true
    },
    {
      "id": 135,
      "filename": "sunset.jpg",
      "public_url": "https://...supabase.co/.../sunset.jpg",
      "description": "A breathtaking sunset...",
      "tags": ["sunset", "ocean", "sky", "nature", "scenic"],
      "status": "completed",
      "file_size_mb": "0.49",
      "uploaded_at": "2025-10-20T16:30:15.123Z",
      "has_ai_analysis": true
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_items": 2,
    "total_pages": 1
  },
  "summary": {
    "total_images": 2,
    "page_count": 2,
    "images_with_ai": 2
  }
}
```

---

## Test 4: Search Files

### Endpoint: GET `/api/files/search`

Search through YOUR files by filename, description, or tags.

### In Postman:

**Method:** `GET`  
**URL:** `http://localhost:3000/api/files/search?q=peony`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Required Query Parameters:**

```
?q=search_term              # Search query (required)
```

**Optional Query Parameters:**

```
&type=image                 # Filter by type (image, video, etc.)
&page=1                     # Page number
&limit=20                   # Items per page
```

**Example URLs:**

```
# Search for "peony"
GET http://localhost:3000/api/files/search?q=peony

# Search for "flowers" in images only
GET http://localhost:3000/api/files/search?q=flowers&type=image

# Search with pagination
GET http://localhost:3000/api/files/search?q=nature&page=1&limit=10
```

### Expected Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 136,
      "filename": "peony.jpg",
      "public_url": "https://...supabase.co/.../peony.jpg",
      "description": "A stunning bouquet of soft pink peonies...",
      "tags": ["peonies", "flowers", "bouquet", "pink", "nature"],
      "mime_type": "image/jpeg",
      "file_size_mb": "0.23",
      "uploaded_at": "2025-10-20T16:42:32.546Z",
      "is_image": true
    }
  ],
  "search": {
    "query": "peony",
    "type_filter": "all",
    "results_found": 1
  },
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

### Search Algorithm:

The search looks in:

1. **Filename** - Case-insensitive match
2. **Description** - Case-insensitive match
3. **Tags array** - Matches any tag containing the search term

Example: Searching for "flower" will find:

- Files with "flower" in filename
- Files with "flower" in description
- Files with tags like ["flowers", "wildflower", "flower-garden"]

---

## Test 5: Get File Statistics

### Endpoint: GET `/api/files/stats`

Returns statistics about YOUR files.

### In Postman:

**Method:** `GET`  
**URL:** `http://localhost:3000/api/files/stats`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**No query parameters needed.**

### Expected Response:

```json
{
  "success": true,
  "data": {
    "total_files": 5,
    "files_with_ai_analysis": 5,
    "status_distribution": {
      "completed": 5,
      "processing": 0,
      "uploaded": 0,
      "failed": 0
    },
    "file_type_distribution": {
      "image": 5,
      "video": 0,
      "document": 0
    },
    "storage_usage": {
      "total_bytes": 1234567,
      "total_mb": 1.18,
      "total_gb": 0.0,
      "human_readable": "1.18 MB"
    },
    "timestamp": "2025-10-20T17:30:00.000Z"
  }
}
```

### Use Cases:

- Dashboard statistics
- Storage quota display
- User analytics
- File type breakdown

---

## Testing Security

### ⚠️ Test Ownership Protection

**Step 1:** Login as User A, upload an image, note the ID (e.g., 136)

**Step 2:** Create and login as User B

**Step 3:** Try to access User A's file:

```
GET http://localhost:3000/api/files/136
Headers: Authorization: Bearer USER_B_TOKEN
```

**Expected:** ❌ 404 "File not found or access denied"

**Step 4:** Try to list all files:

```
GET http://localhost:3000/api/files
Headers: Authorization: Bearer USER_B_TOKEN
```

**Expected:** ✅ Returns only User B's files (empty if they haven't uploaded anything)

---

## Testing Without Authentication

**Test:** Try to access files without token:

```
GET http://localhost:3000/api/files
(No Authorization header)
```

**Expected:** ❌ 401 "No authentication token provided"

---

## Common Errors

### ❌ Error: "No authentication token provided"

**Problem:** Missing or malformed Authorization header

**Fix:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Don't forget the "Bearer " prefix!

---

### ❌ Error: "Invalid or expired token"

**Problem:** Token is expired (default: 1 hour) or invalid

**Fix:** Login again to get a fresh token:

```
POST http://localhost:3000/api/auth/login
```

---

### ❌ Error: "File not found or access denied"

**Problem:**

- File doesn't exist
- File belongs to another user
- Invalid file ID

**Fix:**

- Verify the file ID exists
- Make sure you're using YOUR token
- List your files first to get valid IDs

---

## Server Console Output

When retrieving files, you'll see:

```
🔑 Auth middleware - Token attached successfully
  User ID: 8ab3d05d-92db-4ca7-857a-51ca102e5016
  Email: test@example.com

📂 Fetching files for user: test@example.com
✅ Returned 5 files
```

---

## Quick Testing Workflow

### 1. Get your files list:

```
GET /api/files
→ Returns all your files with IDs
```

### 2. Pick a file ID from the list (e.g., 136)

### 3. Get detailed info:

```
GET /api/files/136
→ Returns full details for that file
```

### 4. Search your files:

```
GET /api/files/search?q=flower
→ Searches through your files
```

### 5. Check your stats:

```
GET /api/files/stats
→ Shows your file statistics
```

---

## Response Field Explanations

### Computed Fields:

- **`file_size_mb`**: File size in megabytes (2 decimals)
- **`file_size_kb`**: File size in kilobytes (2 decimals) - single file only
- **`has_ai_analysis`**: `true` if description or tags exist
- **`is_image`**: `true` if mime_type starts with "image/"
- **`file_extension`**: File extension (e.g., "jpg", "png") - single file only

### Pagination Fields:

- **`current_page`**: Current page number
- **`per_page`**: Items per page
- **`total_items`**: Total files matching query
- **`total_pages`**: Total number of pages
- **`has_next_page`**: Boolean - more pages available
- **`has_prev_page`**: Boolean - previous page available
- **`next_page`**: Next page number or null
- **`prev_page`**: Previous page number or null

---

## Summary

✅ **All file retrieval endpoints are now:**

- Protected with authentication
- Filtered by user automatically
- Secure from unauthorized access
- Ready for production use

🔒 **Security Features:**

- JWT token required for all requests
- RLS policies enforced
- Ownership verification on single file access
- Privacy protection (doesn't reveal other users' files exist)

---

Ready to test? Start with `GET /api/files` to see all your uploaded files! 📁
