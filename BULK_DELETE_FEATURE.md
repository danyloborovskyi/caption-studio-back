# Bulk Delete Files Feature

## Overview

Delete **multiple files at once** with a single API call. All deletions are processed **in parallel** for maximum performance, allowing you to remove up to 100 files simultaneously from both storage and database.

## API Endpoint

```http
DELETE /api/files
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN

{
  "ids": [123, 124, 125, 126]
}
```

## Request Format

### Body Parameters

| Field | Type          | Required | Description                           |
| ----- | ------------- | -------- | ------------------------------------- |
| `ids` | Array[Number] | ✅ Yes   | Array of file IDs to delete (max 100) |

## Response Format

### Success Response (All Files Deleted)

**Status: 200 OK**

```json
{
  "success": true,
  "message": "All 4 files deleted successfully",
  "data": {
    "deleted": [
      {
        "id": 123,
        "filename": "image1.jpg",
        "mimeType": "image/jpeg",
        "storageDeleted": true,
        "databaseDeleted": true
      },
      {
        "id": 124,
        "filename": "image2.png",
        "mimeType": "image/png",
        "storageDeleted": true,
        "databaseDeleted": true
      },
      {
        "id": 125,
        "filename": "image3.jpg",
        "mimeType": "image/jpeg",
        "storageDeleted": true,
        "databaseDeleted": true
      },
      {
        "id": 126,
        "filename": "document.pdf",
        "mimeType": "application/pdf",
        "storageDeleted": true,
        "databaseDeleted": true
      }
    ],
    "totalDeleted": 4,
    "totalRequested": 4,
    "processingTimeSeconds": 0.52
  }
}
```

### Partial Success Response (Some Files Deleted)

**Status: 207 Multi-Status**

```json
{
  "success": true,
  "message": "3 of 4 files deleted successfully",
  "data": {
    "deleted": [
      {
        "id": 123,
        "filename": "image1.jpg",
        "mimeType": "image/jpeg",
        "storageDeleted": true,
        "databaseDeleted": true
      },
      {
        "id": 124,
        "filename": "image2.png",
        "mimeType": "image/png",
        "storageDeleted": true,
        "databaseDeleted": true
      },
      {
        "id": 125,
        "filename": "image3.jpg",
        "mimeType": "image/jpeg",
        "storageDeleted": true,
        "databaseDeleted": true
      }
    ],
    "errors": [
      {
        "id": 126,
        "error": "File not found or access denied",
        "index": 3
      }
    ],
    "totalDeleted": 3,
    "totalFailed": 1,
    "totalRequested": 4,
    "processingTimeSeconds": 0.48
  }
}
```

### Error Response (All Files Failed)

**Status: 400 Bad Request**

```json
{
  "success": false,
  "message": "All file deletions failed",
  "data": {
    "errors": [
      {
        "id": 123,
        "error": "File not found or access denied",
        "index": 0
      },
      {
        "id": 124,
        "error": "File not found or access denied",
        "index": 1
      }
    ],
    "totalFailed": 2,
    "totalRequested": 2,
    "processingTimeSeconds": 0.15
  }
}
```

## Deletion Process

For each file, the endpoint:

1. ✅ **Verifies ownership** - Only files owned by the authenticated user can be deleted
2. 🗑️ **Deletes from storage** - Removes the physical file from Supabase Storage
3. 🗄️ **Deletes from database** - Removes the file record from the database
4. ⚠️ **Continues on storage failure** - If storage deletion fails, still attempts database deletion

## Security

- **Authentication Required**: Bearer token must be provided
- **Ownership Verification**: Users can only delete their own files
- **Parallel Processing**: All ownership checks happen in parallel
- **Independent Operations**: Each file deletion is independent (one failure doesn't affect others)

## Testing with Postman

### Test 1: Delete Multiple Files

```http
DELETE http://localhost:3000/api/files
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

Body (raw JSON):
{
  "ids": [135, 136, 137]
}
```

### Test 2: Delete Single File via Bulk Endpoint

```json
{
  "ids": [135]
}
```

### Test 3: Delete Many Files

```json
{
  "ids": [135, 136, 137, 138, 139, 140, 141, 142, 143, 144]
}
```

## Error Cases

### 1. Missing IDs Array

```json
{
  "success": false,
  "error": "Invalid request format",
  "message": "Request body must contain an 'ids' array"
}
```

### 2. Empty IDs Array

```json
{
  "success": false,
  "error": "No files provided",
  "message": "Please provide at least one file ID to delete"
}
```

### 3. Too Many Files (> 100)

```json
{
  "success": false,
  "error": "Too many files",
  "message": "Maximum 100 files can be deleted at once"
}
```

### 4. File Not Found or Access Denied

```json
{
  "success": true,
  "message": "1 of 2 files deleted successfully",
  "data": {
    "deleted": [
      {
        "id": 135,
        "filename": "image.jpg",
        "storageDeleted": true,
        "databaseDeleted": true
      }
    ],
    "errors": [
      {
        "id": 999,
        "error": "File not found or access denied",
        "index": 1
      }
    ]
  }
}
```

## Response Fields

### Deleted File Object

| Field             | Type    | Description                           |
| ----------------- | ------- | ------------------------------------- |
| `id`              | Number  | File ID                               |
| `filename`        | String  | Original filename                     |
| `mimeType`        | String  | File MIME type                        |
| `storageDeleted`  | Boolean | Whether file was deleted from storage |
| `databaseDeleted` | Boolean | Whether record was deleted from DB    |

### Error Object

| Field   | Type   | Description                |
| ------- | ------ | -------------------------- |
| `id`    | Number | File ID that failed        |
| `error` | String | Error message              |
| `index` | Number | Position in original array |

## Performance

- **Parallel Processing**: All deletions happen simultaneously using `Promise.all()`
- **Maximum Limit**: 100 files per request
- **Response Time**: Includes `processingTimeSeconds` for monitoring
- **Example Performance**:
  - 5 files: ~0.5 seconds
  - 20 files: ~0.8 seconds
  - 100 files: ~1.8 seconds

## Frontend Implementation Example

### React Component with Bulk Delete

```javascript
const BulkFileDelete = ({ selectedFiles }) => {
  const [loading, setLoading] = useState(false);

  const handleBulkDelete = async () => {
    if (
      !confirm(`Delete ${selectedFiles.length} files? This cannot be undone.`)
    ) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/files", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedFiles.map((f) => f.id),
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ ${result.data.totalDeleted} files deleted`);

        if (result.data.errors?.length > 0) {
          console.warn("Some files failed:", result.data.errors);
          alert(
            `${result.data.totalDeleted} deleted, ${result.data.totalFailed} failed`
          );
        } else {
          alert("All files deleted successfully!");
        }

        // Refresh file list
        refreshFileList();
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
      alert("Failed to delete files. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleBulkDelete}
      disabled={loading || selectedFiles.length === 0}
      className="btn-danger"
    >
      {loading ? "Deleting..." : `Delete ${selectedFiles.length} Files`}
    </button>
  );
};
```

### Delete with Confirmation Modal

```javascript
async function bulkDeleteFiles(fileIds) {
  const confirmed = await showConfirmDialog({
    title: "Delete Files",
    message: `Are you sure you want to delete ${fileIds.length} files? This action cannot be undone.`,
    confirmText: "Delete",
    confirmStyle: "danger",
  });

  if (!confirmed) return;

  try {
    const response = await fetch("/api/files", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: fileIds }),
    });

    const result = await response.json();

    if (result.success) {
      showNotification({
        type: "success",
        message: `Successfully deleted ${result.data.totalDeleted} files`,
      });

      // Show warnings for partial failures
      if (result.data.errors?.length > 0) {
        showNotification({
          type: "warning",
          message: `${result.data.totalFailed} files could not be deleted`,
        });
      }

      return result.data.deleted;
    }
  } catch (error) {
    showNotification({
      type: "error",
      message: "Failed to delete files",
    });
    throw error;
  }
}
```

### Delete Selected with State Management

```javascript
const FileManager = () => {
  const [files, setFiles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    setDeleting(true);

    try {
      const response = await fetch("/api/files", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await response.json();

      // Remove deleted files from state
      const deletedIds = result.data.deleted.map((f) => f.id);
      setFiles((prev) => prev.filter((f) => !deletedIds.includes(f.id)));

      // Clear selection
      setSelectedIds([]);

      // Show result
      toast.success(`Deleted ${result.data.totalDeleted} files`);
    } catch (error) {
      toast.error("Failed to delete files");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* File list with checkboxes */}
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          selected={selectedIds.includes(file.id)}
          onToggle={(id) => {
            setSelectedIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            );
          }}
        />
      ))}

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions">
          <span>{selectedIds.length} selected</span>
          <button onClick={handleDeleteSelected} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Selected"}
          </button>
        </div>
      )}
    </div>
  );
};
```

## Use Cases

### 1. Cleanup Old Files

Delete multiple outdated or unused files at once.

### 2. Remove Failed Uploads

Quickly remove files that failed to process correctly.

### 3. Batch Organization

Delete multiple files after moving or reorganizing content.

### 4. User Data Cleanup

Remove all files associated with specific projects or categories.

### 5. Storage Management

Bulk delete files to free up storage space.

## Comparison: Bulk vs Sequential

### Sequential Deletes (Old Way)

```javascript
// ❌ Slow: One at a time
for (const id of fileIds) {
  await fetch(`/api/files/${id}`, {
    method: "DELETE",
  });
}
// Time for 20 files: ~6-10 seconds
```

### Bulk Delete (New Way)

```javascript
// ✅ Fast: All at once
await fetch("/api/files", {
  method: "DELETE",
  body: JSON.stringify({ ids: fileIds }),
});
// Time for 20 files: ~0.8 seconds
```

**Performance Improvement**: ~10x faster for 20 files! 🚀

## Important Notes

⚠️ **Irreversible Operation**

- File deletions are **permanent** and cannot be undone
- Always confirm with users before deleting
- Consider implementing a "soft delete" or trash system for recovery

🔒 **Security**

- Each file's ownership is verified individually
- Users can only delete files they own
- Invalid IDs are safely skipped with error messages

📊 **Storage vs Database**

- If storage deletion fails, database deletion still proceeds
- The `storageDeleted` flag indicates storage deletion success
- Both operations are tracked separately in the response

⚡ **Performance Tips**

- Batch deletions for better performance
- Maximum 100 files per request
- Monitor `processingTimeSeconds` for optimization

## Error Handling Best Practices

```javascript
async function safelyDeleteFiles(fileIds) {
  try {
    const response = await fetch("/api/files", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: fileIds }),
    });

    const result = await response.json();

    // Handle different response statuses
    if (response.status === 200) {
      // All deleted successfully
      return { success: true, deleted: result.data.deleted };
    } else if (response.status === 207) {
      // Partial success
      return {
        success: true,
        deleted: result.data.deleted,
        failed: result.data.errors,
      };
    } else {
      // All failed
      return {
        success: false,
        failed: result.data.errors,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Network or server error",
    };
  }
}
```

## Response Status Codes

| Status | Meaning        | Description                             |
| ------ | -------------- | --------------------------------------- |
| 200    | OK             | All files deleted successfully          |
| 207    | Multi-Status   | Some files deleted, some failed         |
| 400    | Bad Request    | All deletions failed or invalid request |
| 401    | Unauthorized   | Missing or invalid auth token           |
| 500    | Internal Error | Server error during processing          |

## Notes

- All file deletions are processed **in parallel** for maximum speed
- Each deletion is **independent** - one failure doesn't affect others
- The endpoint returns **detailed results** including both successes and failures
- **Ownership is verified** for each file individually
- The response includes **processing time** for performance monitoring
- Use **camelCase** for all field names in responses (consistent with API standards)
- Storage and database deletions are tracked separately for debugging
