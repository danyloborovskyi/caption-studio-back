# Supabase Setup Guide

## Required Supabase Configuration

## ⚠️ CRITICAL: Authentication Redirect URLs

**You must configure this for email confirmation to work correctly in production!**

### Configure in Supabase Dashboard:

1. Go to **Authentication** > **URL Configuration** in your Supabase dashboard
2. Add your production frontend URL to **Redirect URLs**:
   ```
   https://caption-cursor-studio.vercel.app/upload
   ```
3. For local development, also add:
   ```
   http://localhost:3000/upload
   ```
4. Click **Save**

**Why this is needed:**

- When users sign up, they receive a confirmation email
- Clicking the confirmation link redirects them to this URL
- Without this configuration, users will be redirected to `localhost:3000` even in production
- The backend sends `FRONTEND_URL` from environment variables as the redirect URL

### Deployment Checklist:

- [ ] Set `FRONTEND_URL=https://caption-cursor-studio.vercel.app` in Render environment variables
- [ ] Add `https://caption-cursor-studio.vercel.app/upload` to Supabase Redirect URLs
- [ ] Redeploy backend after updating environment variables

---

### 1. Create Storage Bucket

In your Supabase dashboard:

1. Go to **Storage** in the left sidebar
2. Click **Create bucket**
3. Name: `uploads`
4. Make it **Public** (so images can be accessed via URL)
5. Click **Create bucket**

### 2. Create Database Table (Optional but Recommended)

In your Supabase dashboard:

1. Go to **Table Editor** in the left sidebar
2. Click **Create a new table**
3. Table name: `uploaded_files`
4. Add these columns:

```sql
CREATE TABLE uploaded_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  public_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Set Row Level Security (RLS)

1. Go to **Authentication** > **Policies**
2. Find your `uploaded_files` table
3. Enable RLS if you want to restrict access
4. Create policies as needed for your use case

## API Endpoints Created

### Upload Image

```http
POST /api/upload/image
Content-Type: multipart/form-data

{
  "image": <file>
}
```

### Get All Images

```http
GET /api/upload/images
```

### Delete Image

```http
DELETE /api/upload/image/:id
```

## Usage Examples

### Upload with curl:

```bash
curl -X POST http://localhost:3000/api/upload/image \
  -F "image=@/path/to/your/image.jpg"
```

### Upload with JavaScript (frontend):

```javascript
const formData = new FormData();
formData.append("image", file);

const response = await fetch("/api/upload/image", {
  method: "POST",
  body: formData,
});

const result = await response.json();
```

## Notes

- Images are stored in `uploads/images/` folder in Supabase Storage
- File size limit: 5MB (configurable in routes/upload.js)
- Supported formats: JPEG, PNG, GIF, WebP, SVG
- Files get unique names with timestamps
- Public URLs are generated automatically
