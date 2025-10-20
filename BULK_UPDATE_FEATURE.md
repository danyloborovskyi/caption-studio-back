# Bulk Update Files Feature

## Overview

You can now update **multiple files at once** with a single API call. All updates are processed **in parallel** for maximum performance, allowing you to modify filenames, descriptions, and tags for up to 50 files simultaneously.

## API Endpoint

```http
PATCH /api/files
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN

{
  "files": [
    {
      "id": 123,
      "filename": "new-name.jpg",
      "description": "Updated description",
      "tags": ["tag1", "tag2", "tag3"]
    },
    {
      "id": 124,
      "tags": ["updated", "tags"]
    },
    {
      "id": 125,
      "description": "New description"
    }
  ]
}
```

## Request Format

### Body Parameters

| Field   | Type  | Required | Description                           |
| ------- | ----- | -------- | ------------------------------------- |
| `files` | Array | ✅ Yes   | Array of file update objects (max 50) |

### File Update Object

| Field         | Type          | Required    | Description                          |
| ------------- | ------------- | ----------- | ------------------------------------ |
| `id`          | Number        | ✅ Yes      | File ID to update                    |
| `filename`    | String        | ❌ Optional | New filename (max 255 chars)         |
| `description` | String        | ❌ Optional | New description                      |
| `tags`        | Array[String] | ❌ Optional | New tags (max 10, non-empty strings) |

**Note:** At least one of `filename`, `description`, or `tags` must be provided for each file.

## Response Format

### Success Response (All Files Updated)

**Status: 200 OK**

```json
{
  "success": true,
  "message": "All 3 files updated successfully",
  "data": {
    "updated": [
      {
        "id": 123,
        "filename": "new-name.jpg",
        "filePath": "images/user-id/1234567890-abc.jpg",
        "fileSize": 244944,
        "mimeType": "image/jpeg",
        "publicUrl": "https://...",
        "description": "Updated description",
        "tags": ["tag1", "tag2", "tag3"],
        "status": "uploaded",
        "uploadedAt": "2025-10-20T10:00:00.000Z",
        "updatedAt": "2025-10-20T11:30:00.000Z",
        "fileSizeMb": "0.23",
        "hasAiAnalysis": true,
        "isImage": true
      },
      {
        "id": 124,
        "filename": "image2.jpg",
        "description": "Original description",
        "tags": ["updated", "tags"],
        ...
      },
      {
        "id": 125,
        "filename": "image3.png",
        "description": "New description",
        "tags": ["original", "tags"],
        ...
      }
    ],
    "totalUpdated": 3,
    "totalRequested": 3,
    "processingTimeSeconds": 0.45
  }
}
```

### Partial Success Response (Some Files Updated)

**Status: 207 Multi-Status**

```json
{
  "success": true,
  "message": "2 of 3 files updated successfully",
  "data": {
    "updated": [
      {
        "id": 123,
        "filename": "updated.jpg",
        ...
      },
      {
        "id": 124,
        ...
      }
    ],
    "errors": [
      {
        "id": 125,
        "error": "File not found or access denied",
        "index": 2
      }
    ],
    "totalUpdated": 2,
    "totalFailed": 1,
    "totalRequested": 3,
    "processingTimeSeconds": 0.38
  }
}
```

### Error Response (All Files Failed)

**Status: 400 Bad Request**

```json
{
  "success": false,
  "message": "All file updates failed",
  "data": {
    "errors": [
      {
        "id": 123,
        "error": "File not found or access denied",
        "index": 0
      },
      {
        "id": 124,
        "error": "Filename must be a non-empty string",
        "index": 1
      }
    ],
    "totalFailed": 2,
    "totalRequested": 2,
    "processingTimeSeconds": 0.15
  }
}
```

## Validation Rules

### Filename

- Must be a non-empty string
- Maximum 255 characters
- Will be automatically trimmed

### Description

- Must be a string
- No length limit

### Tags

- Must be an array of strings
- Maximum 10 tags per file
- Each tag must be a non-empty string
- Tags are automatically trimmed
- Empty tags are filtered out

## Security

- **Authentication Required**: Bearer token must be provided
- **Ownership Verification**: Users can only update their own files
- **Parallel Processing**: All ownership checks happen in parallel
- **Atomic Updates**: Each file update is independent (one failure doesn't affect others)

## Testing with Postman

### Test 1: Update Multiple Files

```http
PATCH http://localhost:3000/api/files
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

Body (raw JSON):
{
  "files": [
    {
      "id": 135,
      "filename": "tiger-updated.jpg",
      "description": "A majestic tiger in its natural habitat",
      "tags": ["wildlife", "tiger", "nature", "big cat", "endangered"]
    },
    {
      "id": 136,
      "description": "A mesmerizing close-up of a human eye"
    },
    {
      "id": 137,
      "tags": ["books", "reading", "literature", "education", "knowledge"]
    }
  ]
}
```

### Test 2: Update Only Filenames

```json
{
  "files": [
    { "id": 135, "filename": "tiger-photo.jpg" },
    { "id": 136, "filename": "eye-closeup.jpg" },
    { "id": 137, "filename": "book-stack.jpg" }
  ]
}
```

### Test 3: Update Only Tags

```json
{
  "files": [
    { "id": 135, "tags": ["animal", "wild", "safari"] },
    { "id": 136, "tags": ["eye", "macro", "photography"] },
    { "id": 137, "tags": ["books", "study", "library"] }
  ]
}
```

### Test 4: Mixed Updates

```json
{
  "files": [
    {
      "id": 135,
      "filename": "updated-tiger.jpg",
      "tags": ["tiger", "wildlife"]
    },
    {
      "id": 136,
      "description": "Beautiful human eye macro shot"
    }
  ]
}
```

## Error Cases

### 1. Missing Files Array

```json
{
  "success": false,
  "error": "Invalid request format",
  "message": "Request body must contain a 'files' array"
}
```

### 2. Empty Files Array

```json
{
  "success": false,
  "error": "No files provided",
  "message": "Please provide at least one file to update"
}
```

### 3. Too Many Files (> 50)

```json
{
  "success": false,
  "error": "Too many files",
  "message": "Maximum 50 files can be updated at once"
}
```

### 4. Missing File ID

```json
{
  "success": false,
  "message": "All file updates failed",
  "data": {
    "errors": [
      {
        "id": null,
        "error": "File ID is required",
        "index": 0
      }
    ]
  }
}
```

### 5. No Updates Provided

```json
{
  "success": true,
  "message": "1 of 2 files updated successfully",
  "data": {
    "errors": [
      {
        "id": 125,
        "error": "No updates provided for this file",
        "index": 1
      }
    ]
  }
}
```

## Performance

- **Parallel Processing**: All updates happen simultaneously using `Promise.all()`
- **Maximum Limit**: 50 files per request
- **Response Time**: Includes `processingTimeSeconds` for monitoring
- **Example Performance**:
  - 3 files: ~0.45 seconds
  - 10 files: ~0.7 seconds
  - 50 files: ~1.5 seconds

## Frontend Implementation Example

### React Component with Bulk Update

```javascript
const BulkFileUpdate = ({ selectedFiles }) => {
  const [loading, setLoading] = useState(false);

  const handleBulkUpdate = async () => {
    setLoading(true);

    // Prepare updates
    const updates = selectedFiles
      .map((file) => ({
        id: file.id,
        filename: file.newFilename || undefined,
        description: file.newDescription || undefined,
        tags: file.newTags || undefined,
      }))
      .filter((update) => update.filename || update.description || update.tags);

    try {
      const response = await fetch("/api/files", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: updates }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ ${result.data.totalUpdated} files updated`);

        if (result.data.errors?.length > 0) {
          console.warn("Some files failed:", result.data.errors);
        }
      }
    } catch (error) {
      console.error("Bulk update error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleBulkUpdate}
      disabled={loading || selectedFiles.length === 0}
    >
      {loading ? "Updating..." : `Update ${selectedFiles.length} Files`}
    </button>
  );
};
```

### Batch Update with Validation

```javascript
async function bulkUpdateFiles(files) {
  // Validate before sending
  const validUpdates = files.filter((file) => {
    if (!file.id) return false;
    if (!file.filename && !file.description && !file.tags) return false;
    if (file.tags && file.tags.length > 10) return false;
    return true;
  });

  if (validUpdates.length === 0) {
    throw new Error("No valid updates to process");
  }

  const response = await fetch("/api/files", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: validUpdates.map((f) => ({
        id: f.id,
        filename: f.filename,
        description: f.description,
        tags: f.tags,
      })),
    }),
  });

  return response.json();
}
```

## Use Cases

### 1. Batch Rename Files

Update filenames for multiple files after importing from a specific source.

### 2. Add Tags to Multiple Images

Apply consistent tags to a group of related images.

### 3. Update Descriptions in Bulk

Add or modify descriptions for multiple files at once.

### 4. Organize Imported Files

After bulk import, quickly organize files with proper names, descriptions, and tags.

### 5. Cleanup and Organization

Periodically update metadata for better organization and searchability.

## Comparison: Bulk vs Sequential

### Sequential Updates (Old Way)

```javascript
// ❌ Slow: One at a time
for (const file of files) {
  await fetch(`/api/files/${file.id}`, {
    method: "PATCH",
    body: JSON.stringify({ tags: file.tags }),
  });
}
// Time for 10 files: ~3-5 seconds
```

### Bulk Update (New Way)

```javascript
// ✅ Fast: All at once
await fetch("/api/files", {
  method: "PATCH",
  body: JSON.stringify({
    files: files.map((f) => ({ id: f.id, tags: f.tags })),
  }),
});
// Time for 10 files: ~0.7 seconds
```

**Performance Improvement**: ~5x faster for 10 files! 🚀

## Notes

- All file updates are processed **in parallel** for maximum speed
- Each update is **independent** - one failure doesn't affect others
- The endpoint returns **detailed results** including both successes and failures
- **Ownership is verified** for each file individually
- The response includes **processing time** for performance monitoring
- Use **camelCase** for all field names in responses (consistent with API standards)
