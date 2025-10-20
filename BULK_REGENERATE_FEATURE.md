# Bulk Regenerate AI Analysis Feature

## Overview

Regenerate AI-generated descriptions and tags for **multiple images at once** with a single API call. All regenerations are processed **in parallel** for maximum performance, with support for different tag styles (neutral, playful, SEO).

## API Endpoint

```http
POST /api/files/regenerate
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN

{
  "ids": [123, 124, 125],
  "tagStyle": "seo"
}
```

## Request Format

### Body Parameters

| Field      | Type          | Required    | Description                                                    |
| ---------- | ------------- | ----------- | -------------------------------------------------------------- |
| `ids`      | Array[Number] | ✅ Yes      | Array of image file IDs to regenerate (max 20)                 |
| `tagStyle` | String        | ❌ Optional | Tag style: "neutral", "playful", or "seo" (default: "neutral") |

## Response Format

### Success Response (All Files Regenerated)

**Status: 200 OK**

```json
{
  "success": true,
  "message": "All 3 files regenerated successfully",
  "data": {
    "regenerated": [
      {
        "id": 123,
        "filename": "image1.jpg",
        "filePath": "images/user-id/image1.jpg",
        "fileSize": 244944,
        "mimeType": "image/jpeg",
        "publicUrl": "https://...",
        "description": "A vibrant sunset over the ocean with golden hues painting the sky.",
        "tags": ["sunset photography", "ocean view", "golden hour", "coastal scenery", "nature landscape"],
        "status": "completed",
        "uploadedAt": "2025-10-20T10:00:00.000Z",
        "updatedAt": "2025-10-20T12:00:00.000Z",
        "fileSizeMb": "0.23",
        "hasAiAnalysis": true,
        "isImage": true
      },
      {
        "id": 124,
        "filename": "image2.jpg",
        "description": "A majestic tiger prowling through dense jungle foliage.",
        "tags": ["tiger photography", "wildlife", "jungle animals", "big cat", "nature documentary"],
        ...
      },
      {
        "id": 125,
        "filename": "image3.png",
        "description": "A stack of antique books on a wooden desk with warm lighting.",
        "tags": ["vintage books", "library aesthetic", "reading corner", "old books photography", "study space"],
        ...
      }
    ],
    "totalRegenerated": 3,
    "totalRequested": 3,
    "tagStyle": "seo",
    "processingTimeSeconds": 5.42
  }
}
```

### Partial Success Response (Some Files Regenerated)

**Status: 207 Multi-Status**

```json
{
  "success": true,
  "message": "2 of 3 files regenerated successfully",
  "data": {
    "regenerated": [
      {
        "id": 123,
        "filename": "image1.jpg",
        "description": "A vibrant sunset over the ocean.",
        "tags": ["sunset", "ocean", "sky", "nature", "landscape"],
        ...
      },
      {
        "id": 124,
        "filename": "image2.jpg",
        "description": "A majestic tiger in the wild.",
        "tags": ["tiger", "wildlife", "jungle", "animal", "nature"],
        ...
      }
    ],
    "errors": [
      {
        "id": 125,
        "error": "Only images can be analyzed",
        "index": 2
      }
    ],
    "totalRegenerated": 2,
    "totalFailed": 1,
    "totalRequested": 3,
    "tagStyle": "neutral",
    "processingTimeSeconds": 4.28
  }
}
```

### Error Response (All Files Failed)

**Status: 400 Bad Request**

```json
{
  "success": false,
  "message": "All file regenerations failed",
  "data": {
    "errors": [
      {
        "id": 123,
        "error": "File not found or access denied",
        "index": 0
      },
      {
        "id": 124,
        "error": "No public URL available",
        "index": 1
      },
      {
        "id": 125,
        "error": "Only images can be analyzed",
        "index": 2
      }
    ],
    "totalFailed": 3,
    "totalRequested": 3,
    "processingTimeSeconds": 0.35
  }
}
```

## Tag Styles

The `tagStyle` parameter allows you to customize how AI generates tags:

| Style       | Description                    | Example Tags                                                                             |
| ----------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| **Neutral** | Professional, descriptive      | `sunset`, `ocean`, `nature`, `landscape`, `sky`                                          |
| **Playful** | Fun, creative, engaging        | `golden hour magic`, `ocean vibes`, `sunset goals`, `nature beauty`, `scenic perfection` |
| **SEO**     | Search-optimized, keyword-rich | `sunset photography`, `ocean view`, `golden hour`, `coastal scenery`, `nature landscape` |

## Validation & Requirements

### File Requirements

- ✅ Must be an **image file** (mime type starts with `image/`)
- ✅ Must have a **public URL** available
- ✅ Must be **owned by the authenticated user**

### Limits

- **Maximum 20 files** per request (lower than other bulk operations due to OpenAI API costs)
- Files that don't meet requirements are skipped with error details

## Security

- **Authentication Required**: Bearer token must be provided
- **Ownership Verification**: Users can only regenerate their own files
- **Image Validation**: Only image files can be regenerated
- **Parallel Processing**: All operations happen simultaneously
- **Independent Operations**: Each regeneration is independent (one failure doesn't affect others)

## Testing with Postman

### Test 1: Regenerate Multiple Images with Neutral Style

```http
POST http://localhost:3000/api/files/regenerate
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

Body (raw JSON):
{
  "ids": [135, 136, 137]
}
```

### Test 2: Regenerate with Playful Style

```json
{
  "ids": [135, 136, 137],
  "tagStyle": "playful"
}
```

### Test 3: Regenerate with SEO Style

```json
{
  "ids": [135, 136, 137],
  "tagStyle": "seo"
}
```

### Test 4: Compare Different Styles

First, regenerate with neutral:

```json
{
  "ids": [135],
  "tagStyle": "neutral"
}
```

Then regenerate the same image with SEO:

```json
{
  "ids": [135],
  "tagStyle": "seo"
}
```

Compare the tags to see the difference!

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
  "message": "Please provide at least one file ID to regenerate"
}
```

### 3. Too Many Files (> 20)

```json
{
  "success": false,
  "error": "Too many files",
  "message": "Maximum 20 files can be regenerated at once"
}
```

### 4. Non-Image File

```json
{
  "success": true,
  "message": "2 of 3 files regenerated successfully",
  "data": {
    "regenerated": [...],
    "errors": [
      {
        "id": 125,
        "error": "Only images can be analyzed",
        "index": 2
      }
    ]
  }
}
```

### 5. No Public URL

```json
{
  "errors": [
    {
      "id": 126,
      "error": "No public URL available",
      "index": 1
    }
  ]
}
```

### 6. OpenAI API Failure

```json
{
  "errors": [
    {
      "id": 127,
      "error": "AI analysis failed: Timeout while downloading image",
      "index": 2
    }
  ]
}
```

## Performance

- **Parallel Processing**: All regenerations happen simultaneously using `Promise.all()`
- **Maximum Limit**: 20 files per request (AI operations are slower and more costly)
- **Response Time**: Includes `processingTimeSeconds` for monitoring
- **Example Performance**:
  - 3 files: ~5-6 seconds
  - 10 files: ~6-8 seconds
  - 20 files: ~8-12 seconds

**Note**: OpenAI API calls take 1-3 seconds each, but parallel processing significantly speeds up bulk operations.

## Cost Considerations

⚠️ **AI Analysis Costs**

- Each regeneration makes a call to the OpenAI Vision API
- GPT-4o-mini costs approximately $0.001-0.002 per image
- Bulk regenerations incur cumulative costs
- Consider implementing usage limits or cost tracking

## Frontend Implementation Example

### React Component with Bulk Regenerate

```javascript
const BulkRegenerate = ({ selectedImages }) => {
  const [loading, setLoading] = useState(false);
  const [tagStyle, setTagStyle] = useState("neutral");

  const handleBulkRegenerate = async () => {
    if (
      !confirm(
        `Regenerate AI analysis for ${selectedImages.length} images with ${tagStyle} style?`
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/files/regenerate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedImages.map((img) => img.id),
          tagStyle: tagStyle,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ ${result.data.totalRegenerated} files regenerated`);

        if (result.data.errors?.length > 0) {
          console.warn("Some files failed:", result.data.errors);
          toast.warning(
            `${result.data.totalRegenerated} regenerated, ${result.data.totalFailed} failed`
          );
        } else {
          toast.success("All files regenerated successfully!");
        }

        // Refresh file list with new descriptions and tags
        refreshFileList();
      }
    } catch (error) {
      console.error("Bulk regenerate error:", error);
      toast.error("Failed to regenerate files");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <select value={tagStyle} onChange={(e) => setTagStyle(e.target.value)}>
        <option value="neutral">Neutral (Professional)</option>
        <option value="playful">Playful (Creative)</option>
        <option value="seo">SEO (Searchable)</option>
      </select>

      <button
        onClick={handleBulkRegenerate}
        disabled={loading || selectedImages.length === 0}
      >
        {loading
          ? `Regenerating ${selectedImages.length}...`
          : `Regenerate ${selectedImages.length} Images`}
      </button>
    </div>
  );
};
```

### Regenerate with Progress Tracking

```javascript
async function bulkRegenerateWithProgress(
  imageIds,
  tagStyle = "neutral",
  onProgress
) {
  try {
    onProgress?.({ status: "starting", total: imageIds.length });

    const response = await fetch("/api/files/regenerate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: imageIds, tagStyle }),
    });

    const result = await response.json();

    onProgress?.({
      status: "complete",
      total: imageIds.length,
      successful: result.data.totalRegenerated || 0,
      failed: result.data.totalFailed || 0,
      duration: result.data.processingTimeSeconds,
    });

    return result;
  } catch (error) {
    onProgress?.({ status: "error", error: error.message });
    throw error;
  }
}

// Usage
bulkRegenerateWithProgress([123, 124, 125], "seo", (progress) => {
  if (progress.status === "complete") {
    console.log(
      `Completed ${progress.successful} of ${progress.total} in ${progress.duration}s`
    );
  }
});
```

### Batch Regenerate with Style Selection

```javascript
const ImageManager = () => {
  const [images, setImages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerateWithStyle = async (style) => {
    if (selectedIds.length === 0) return;

    setRegenerating(true);

    try {
      const response = await fetch("/api/files/regenerate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedIds,
          tagStyle: style,
        }),
      });

      const result = await response.json();

      // Update images with new data
      const regeneratedMap = new Map(
        result.data.regenerated.map((img) => [img.id, img])
      );

      setImages((prev) =>
        prev.map((img) =>
          regeneratedMap.has(img.id) ? regeneratedMap.get(img.id) : img
        )
      );

      // Clear selection
      setSelectedIds([]);

      // Show result
      toast.success(
        `Regenerated ${result.data.totalRegenerated} images with ${style} style`
      );
    } catch (error) {
      toast.error("Failed to regenerate images");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div>
      {/* Image grid with selection */}
      <ImageGrid
        images={images}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions">
          <span>{selectedIds.length} selected</span>
          <div className="style-buttons">
            <button
              onClick={() => handleRegenerateWithStyle("neutral")}
              disabled={regenerating}
            >
              Regenerate (Neutral)
            </button>
            <button
              onClick={() => handleRegenerateWithStyle("playful")}
              disabled={regenerating}
            >
              Regenerate (Playful)
            </button>
            <button
              onClick={() => handleRegenerateWithStyle("seo")}
              disabled={regenerating}
            >
              Regenerate (SEO)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

## Use Cases

### 1. Update to Different Tag Style

Switch from neutral to SEO tags for better discoverability without re-uploading.

### 2. Improve Old Descriptions

Regenerate AI analysis for images uploaded before description quality improvements.

### 3. Experiment with Styles

Try different tag styles to see which works best for your content.

### 4. Fix Failed Analysis

Regenerate images where initial AI analysis failed or was incomplete.

### 5. Batch Optimization

Apply SEO-optimized tags to multiple images for better search performance.

## Comparison: Bulk vs Sequential

### Sequential Regeneration (Old Way)

```javascript
// ❌ Slow: One at a time
for (const id of imageIds) {
  await fetch(`/api/files/${id}/regenerate`, {
    method: "POST",
    body: JSON.stringify({ tagStyle: "seo" }),
  });
}
// Time for 10 images: ~60-80 seconds
```

### Bulk Regeneration (New Way)

```javascript
// ✅ Fast: All at once
await fetch("/api/files/regenerate", {
  method: "POST",
  body: JSON.stringify({
    ids: imageIds,
    tagStyle: "seo",
  }),
});
// Time for 10 images: ~6-8 seconds
```

**Performance Improvement**: ~10x faster for 10 images! 🚀

## Important Notes

⚠️ **Content Overwriting**

- Regeneration **permanently replaces** existing descriptions and tags
- Consider backing up important manual edits before regenerating
- The `updatedAt` timestamp will be changed

💰 **API Costs**

- Each regeneration makes an OpenAI API call
- Bulk operations incur cumulative costs
- Monitor your OpenAI usage and set limits

🖼️ **Image Files Only**

- Only image files can be regenerated
- Non-image files are skipped with error messages
- PDF, video, and other file types are not supported

⚡ **Performance Tips**

- Batch regenerations for better efficiency
- Maximum 20 files per request
- Consider off-peak times for large batches
- Monitor `processingTimeSeconds` for optimization

## Response Status Codes

| Status | Meaning        | Description                                 |
| ------ | -------------- | ------------------------------------------- |
| 200    | OK             | All files regenerated successfully          |
| 207    | Multi-Status   | Some files regenerated, some failed         |
| 400    | Bad Request    | All regenerations failed or invalid request |
| 401    | Unauthorized   | Missing or invalid auth token               |
| 500    | Internal Error | Server error during processing              |

## Notes

- All regenerations are processed **in parallel** for maximum speed
- Each regeneration is **independent** - one failure doesn't affect others
- The endpoint returns **detailed results** including both successes and failures
- **Ownership is verified** for each file individually
- The response includes **processing time** for performance monitoring
- The **tag style** used is included in the response
- Use **camelCase** for all field names in responses (consistent with API standards)
- Failed regenerations mark the file status as "failed" in the database
