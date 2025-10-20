# Testing Update File Metadata (PATCH)

## Endpoint: PATCH `/api/files/:id`

Update the description and/or tags for a file you own.

---

## Features

- ✅ Update description only
- ✅ Update tags only
- ✅ Update both at once
- ✅ Ownership verification
- ✅ Input validation
- ✅ Maximum 10 tags
- ✅ Auto-trim and filter empty tags

---

## Basic Usage

### In Postman:

**Method:** `PATCH`  
**URL:** `http://localhost:3000/api/files/136` (replace 136 with your file ID)

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body:** (raw, JSON)

```json
{
  "description": "Your custom description here",
  "tags": ["tag1", "tag2", "tag3"]
}
```

---

## Test Scenarios

### Test 1: Update Description Only

**Request:**

```json
{
  "description": "A beautiful spring garden with colorful tulips and daffodils"
}
```

**Response:**

```json
{
  "success": true,
  "message": "File metadata updated successfully",
  "data": {
    "id": 136,
    "filename": "garden.jpg",
    "description": "A beautiful spring garden with colorful tulips and daffodils",
    "tags": ["flowers", "nature", "garden"],  // ← Existing tags unchanged
    "updated_at": "2025-10-20T18:00:00.000Z",
    ...
  }
}
```

✅ **Result:** Only description updated, tags remain the same

---

### Test 2: Update Tags Only

**Request:**

```json
{
  "tags": ["spring", "garden", "colorful", "flowers", "outdoor"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "File metadata updated successfully",
  "data": {
    "id": 136,
    "filename": "garden.jpg",
    "description": "A beautiful spring garden...",  // ← Existing description unchanged
    "tags": ["spring", "garden", "colorful", "flowers", "outdoor"],
    "updated_at": "2025-10-20T18:01:00.000Z",
    ...
  }
}
```

✅ **Result:** Only tags updated, description remains the same

---

### Test 3: Update Both Description and Tags

**Request:**

```json
{
  "description": "Vibrant spring flowers blooming in a sunny garden",
  "tags": ["spring", "flowers", "garden", "sunny", "bloom"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "File metadata updated successfully",
  "data": {
    "id": 136,
    "filename": "garden.jpg",
    "description": "Vibrant spring flowers blooming in a sunny garden",
    "tags": ["spring", "flowers", "garden", "sunny", "bloom"],
    "updated_at": "2025-10-20T18:02:00.000Z",
    ...
  }
}
```

✅ **Result:** Both description and tags updated

---

### Test 4: Clear Description (Set to Empty String)

**Request:**

```json
{
  "description": ""
}
```

**Response:**

```json
{
  "success": true,
  "message": "File metadata updated successfully",
  "data": {
    "id": 136,
    "filename": "garden.jpg",
    "description": "",  // ← Cleared
    "tags": ["spring", "flowers"],
    ...
  }
}
```

✅ **Result:** Description cleared

---

### Test 5: Clear All Tags

**Request:**

```json
{
  "tags": []
}
```

**Response:**

```json
{
  "success": true,
  "message": "File metadata updated successfully",
  "data": {
    "id": 136,
    "filename": "garden.jpg",
    "description": "Vibrant spring flowers...",
    "tags": [],  // ← All tags removed
    ...
  }
}
```

✅ **Result:** All tags removed

---

## Validation Errors

### ❌ Error 1: No Updates Provided

**Request:**

```json
{}
```

**Response:**

```json
{
  "success": false,
  "error": "No updates provided",
  "message": "Please provide at least one field to update: description or tags"
}
```

**Status:** 400 Bad Request

---

### ❌ Error 2: Invalid Tags Format (Not Array)

**Request:**

```json
{
  "tags": "not-an-array"
}
```

**Response:**

```json
{
  "success": false,
  "error": "Invalid tags format",
  "message": "Tags must be an array of strings"
}
```

**Status:** 400 Bad Request

---

### ❌ Error 3: Empty Tag in Array

**Request:**

```json
{
  "tags": ["valid", "", "also-valid"]
}
```

**Response:**

```json
{
  "success": false,
  "error": "Invalid tags",
  "message": "All tags must be non-empty strings"
}
```

**Status:** 400 Bad Request

---

### ❌ Error 4: Too Many Tags (Max 10)

**Request:**

```json
{
  "tags": [
    "tag1",
    "tag2",
    "tag3",
    "tag4",
    "tag5",
    "tag6",
    "tag7",
    "tag8",
    "tag9",
    "tag10",
    "tag11"
  ]
}
```

**Response:**

```json
{
  "success": false,
  "error": "Too many tags",
  "message": "Maximum 10 tags allowed"
}
```

**Status:** 400 Bad Request

---

### ❌ Error 5: Invalid Description Type

**Request:**

```json
{
  "description": 12345
}
```

**Response:**

```json
{
  "success": false,
  "error": "Invalid description format",
  "message": "Description must be a string"
}
```

**Status:** 400 Bad Request

---

### ❌ Error 6: File Not Found or Not Owned

**Request to another user's file:**

```
PATCH http://localhost:3000/api/files/999
Body: { "description": "Trying to update" }
```

**Response:**

```json
{
  "success": false,
  "error": "File not found or access denied"
}
```

**Status:** 404 Not Found

---

### ❌ Error 7: No Authentication

**Request without Authorization header:**

**Response:**

```json
{
  "success": false,
  "error": "No authentication token provided",
  "message": "Please provide a valid Bearer token in the Authorization header"
}
```

**Status:** 401 Unauthorized

---

## Special Cases

### Auto-Trimming Tags

Tags are automatically trimmed of whitespace:

**Request:**

```json
{
  "tags": ["  spring  ", "  flowers ", "garden  "]
}
```

**Stored as:**

```json
{
  "tags": ["spring", "flowers", "garden"]
}
```

---

### Empty Tags Filtered Out

Empty strings after trimming are automatically removed:

**Request:**

```json
{
  "tags": ["valid", "  ", "also-valid", ""]
}
```

**Stored as:**

```json
{
  "tags": ["valid", "also-valid"]
}
```

---

## Use Cases

### Use Case 1: Fix AI-Generated Description

AI might generate a description you want to improve:

```json
{
  "description": "A stunning sunset over the Pacific Ocean with vibrant orange and purple hues reflecting on the calm waters"
}
```

---

### Use Case 2: Add Custom Tags

Add your own categorization:

```json
{
  "tags": ["portfolio", "2024", "client-work", "featured"]
}
```

---

### Use Case 3: Translate Description

Replace with translated version:

```json
{
  "description": "Un hermoso atardecer sobre el océano Pacífico"
}
```

---

### Use Case 4: SEO Optimization

Optimize for search:

```json
{
  "description": "Professional sunset photography - Pacific Ocean seascape with dramatic clouds",
  "tags": ["photography", "sunset", "seascape", "professional", "stock-photo"]
}
```

---

## Server Console Output

When updating file metadata, you'll see:

```
🔑 Auth middleware - Token attached successfully
  User ID: 8ab3d05d-92db-4ca7-857a-51ca102e5016
  Email: test@example.com

✏️  User test@example.com attempting to update file ID: 136
✅ File metadata updated successfully: garden.jpg
```

---

## Testing Workflow

### Step 1: Get a File to Update

```
GET /api/files
```

Pick a file ID from the response.

---

### Step 2: View Current Metadata

```
GET /api/files/136
```

See current description and tags.

---

### Step 3: Update Metadata

```
PATCH /api/files/136
Body: {
  "description": "New description",
  "tags": ["new", "tags"]
}
```

---

### Step 4: Verify Update

```
GET /api/files/136
```

Confirm the changes were applied.

---

## Comparison: Before and After

### Before Update:

```json
{
  "id": 136,
  "filename": "photo.jpg",
  "description": "AI-generated: A picture of flowers",
  "tags": ["flowers", "nature", "garden"],
  "updated_at": "2025-10-20T16:00:00.000Z"
}
```

### After Update:

```json
{
  "id": 136,
  "filename": "photo.jpg",
  "description": "My beautiful rose garden in spring",
  "tags": ["roses", "spring", "garden", "personal", "2024"],
  "updated_at": "2025-10-20T18:00:00.000Z" // ← Timestamp updated!
}
```

---

## Frontend Example

### JavaScript/Fetch

```javascript
async function updateFileMetadata(fileId, description, tags) {
  const token = localStorage.getItem("token");

  const response = await fetch(`/api/files/${fileId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description,
      tags,
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("Updated:", data.data);
  } else {
    console.error("Error:", data.error);
  }

  return data;
}

// Usage
await updateFileMetadata(136, "My custom description", [
  "tag1",
  "tag2",
  "tag3",
]);
```

---

### React Example

```javascript
import { useState } from "react";

function FileEditor({ fileId, initialDescription, initialTags }) {
  const [description, setDescription] = useState(initialDescription);
  const [tags, setTags] = useState(initialTags);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description, tags }),
      });

      const data = await response.json();

      if (data.success) {
        alert("File updated successfully!");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to update file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />

      <input
        value={tags.join(", ")}
        onChange={(e) =>
          setTags(e.target.value.split(",").map((t) => t.trim()))
        }
        placeholder="Tags (comma-separated)"
      />

      <button onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
```

---

## Security Features

✅ **Authentication Required** - Must have valid JWT token  
✅ **Ownership Verification** - Can only update YOUR files  
✅ **Input Validation** - Prevents invalid data  
✅ **RLS Enforced** - Database-level security  
✅ **No File Deletion** - Metadata only, file stays safe

---

## Summary

**Endpoint:** `PATCH /api/files/:id`

**Can Update:**

- ✅ Description (string)
- ✅ Tags (array of strings, max 10)
- ✅ Both together
- ✅ Either one separately

**Validation:**

- ✅ Tags must be array
- ✅ Max 10 tags
- ✅ Tags auto-trimmed
- ✅ Empty tags filtered out
- ✅ Description must be string

**Security:**

- ✅ Requires authentication
- ✅ Ownership verified
- ✅ Cannot update others' files

---

Ready to test? Update your first file! ✏️
