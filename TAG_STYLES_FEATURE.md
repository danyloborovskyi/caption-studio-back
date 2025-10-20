# Tag Styles Feature

## Overview

The AI image analysis now supports **3 different tag styles** to suit different use cases:

1. **Neutral** (Default) - Professional, clear, descriptive tags
2. **Playful** - Fun, creative, engaging tags with trending terms
3. **SEO** - Highly searchable, keyword-optimized tags for discoverability

## How It Works

When analyzing an image, the AI generates:

- **Description**: Detailed, engaging description (1-2 sentences) - consistent across all styles
- **Tags**: 5 relevant tags/keywords - **style varies based on your choice**

### Tag Style Differences

| Style       | Description                  | Example Tags                                                                                          |
| ----------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Neutral** | Professional and descriptive | `flower`, `pink petals`, `nature`, `bloom`, `garden`                                                  |
| **Playful** | Fun and creative             | `pretty pink blooms 🌸`, `flower power`, `botanical beauty`, `petal perfection`, `garden goals`       |
| **SEO**     | Search-optimized             | `pink flower photography`, `flower close up`, `botanical garden`, `floral design`, `nature wallpaper` |

## API Endpoints with Tag Style Support

All AI analysis endpoints now accept a `tagStyle` parameter in the request body:

### 1. **Upload and Analyze**

```http
POST /api/upload/upload-and-analyze
Content-Type: multipart/form-data

Form Data:
- image: [file]
- tagStyle: "neutral" | "playful" | "seo"  (optional, defaults to "neutral")
```

### 2. **Analyze Existing Image**

```http
POST /api/upload/analyze/:id
Content-Type: application/json

{
  "tagStyle": "neutral" | "playful" | "seo"
}
```

### 3. **Bulk Upload and Analyze**

```http
POST /api/upload/bulk-upload-and-analyze
Content-Type: multipart/form-data

Form Data:
- images: [file1, file2, ...]
- tagStyle: "neutral" | "playful" | "seo"  (optional, defaults to "neutral")
```

### 4. **Bulk Analyze Existing Images**

```http
POST /api/upload/bulk-analyze
Content-Type: application/json

{
  "ids": [1, 2, 3],
  "tagStyle": "neutral" | "playful" | "seo"
}
```

### 5. **Regenerate AI Analysis**

```http
POST /api/files/:id/regenerate
Content-Type: application/json

{
  "tagStyle": "neutral" | "playful" | "seo"
}
```

## Testing with Postman

### Test 1: Upload with Different Styles

#### Neutral Tags (Professional)

```
POST http://localhost:3000/api/upload/upload-and-analyze
Authorization: Bearer YOUR_ACCESS_TOKEN

Body (form-data):
- image: [select your image file]
- tagStyle: neutral
```

**Expected Tags**: Professional, descriptive

- Example: `portrait`, `professional`, `business attire`, `office`, `headshot`

#### Playful Tags (Creative)

```
POST http://localhost:3000/api/upload/upload-and-analyze
Authorization: Bearer YOUR_ACCESS_TOKEN

Body (form-data):
- image: [select your image file]
- tagStyle: playful
```

**Expected Tags**: Fun, engaging, possibly with emojis

- Example: `boss vibes`, `professional chic`, `career goals`, `workwear inspo`, `confidence 💼`

#### SEO Tags (Search-Optimized)

```
POST http://localhost:3000/api/upload/upload-and-analyze
Authorization: Bearer YOUR_ACCESS_TOKEN

Body (form-data):
- image: [select your image file]
- tagStyle: seo
```

**Expected Tags**: Keyword-rich, searchable terms

- Example: `professional headshot`, `business portrait`, `corporate photography`, `linkedin profile photo`, `office professional`

### Test 2: Regenerate with Different Styles

First, upload an image (without specifying style - uses neutral by default):

```
POST http://localhost:3000/api/upload/upload-and-analyze
Authorization: Bearer YOUR_ACCESS_TOKEN

Body (form-data):
- image: [your image]
```

Note the `id` from the response. Then regenerate with different styles:

#### Try Playful Style

```
POST http://localhost:3000/api/files/123/regenerate
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "tagStyle": "playful"
}
```

#### Try SEO Style

```
POST http://localhost:3000/api/files/123/regenerate
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "tagStyle": "seo"
}
```

Compare the tags from each regeneration to see the difference!

### Test 3: Bulk Upload with Tag Style

```
POST http://localhost:3000/api/upload/bulk-upload-and-analyze
Authorization: Bearer YOUR_ACCESS_TOKEN

Body (form-data):
- images: [file1]
- images: [file2]
- images: [file3]
- tagStyle: seo
```

All images will be analyzed with SEO-optimized tags.

## Response Format

All endpoints return the `tagStyle` used in the analysis:

```json
{
  "success": true,
  "message": "Image uploaded and analyzed successfully",
  "data": {
    "id": 123,
    "filename": "example.jpg",
    "description": "A vibrant bouquet of pink peonies showcases their delicate petals.",
    "tags": [
      "pink peonies",
      "flower bouquet",
      "floral photography",
      "botanical close up",
      "nature wallpaper"
    ],
    "tagStyle": "seo",
    "publicUrl": "https://...",
    ...
  }
}
```

## Default Behavior

If no `tagStyle` is specified:

- **Defaults to "neutral"** (professional, descriptive tags)
- Invalid values automatically fall back to "neutral"

## Use Cases

### Neutral Style

- Professional documentation
- Product catalogs
- Business websites
- Academic/educational content

### Playful Style

- Social media posts
- Creative portfolios
- Lifestyle blogs
- Entertainment content

### SEO Style

- E-commerce products
- Blog posts
- Marketing materials
- Content that needs to be discoverable via search

## Frontend Implementation Example

```javascript
// React component with style selector
const ImageUpload = () => {
  const [tagStyle, setTagStyle] = useState("neutral");
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("tagStyle", tagStyle); // Add tag style

    const response = await fetch("/api/upload/upload-and-analyze", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log("Generated tags:", result.data.tags);
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />

      <select value={tagStyle} onChange={(e) => setTagStyle(e.target.value)}>
        <option value="neutral">Neutral (Professional)</option>
        <option value="playful">Playful (Creative)</option>
        <option value="seo">SEO (Searchable)</option>
      </select>

      <button onClick={handleUpload}>Upload & Analyze</button>
    </div>
  );
};
```

## Technical Details

### Implementation

- Tag style prompts defined in `routes/upload.js` and `routes/files.js`
- `analyzeImageWithAI()` function accepts `tagStyle` parameter
- OpenAI Vision API receives different instructions based on style
- Same description generation across all styles for consistency

### Validation

- Valid styles: `"neutral"`, `"playful"`, `"seo"`
- Invalid or missing values default to `"neutral"`
- Case-sensitive (lowercase only)

## Notes

- **Description remains consistent** across all tag styles
- Only the **tags change** based on the selected style
- All uploaded files can be **regenerated** with a different style anytime
- The `tagStyle` used is **returned in the response** for reference
