# Testing Avatar Upload & Update

## Endpoints

- **POST** `/api/auth/avatar` - Upload or update user avatar
- **DELETE** `/api/auth/avatar` - Delete user avatar
- **GET** `/api/auth/user` - View profile with avatar

---

## Features

- ✅ Upload avatar image (JPEG, PNG, WebP, GIF)
- ✅ Automatically replace old avatar when uploading new one
- ✅ User-specific avatar storage
- ✅ 5MB file size limit
- ✅ Delete avatar
- ✅ Avatar URL stored in user metadata
- ✅ Public avatar URLs

---

## Setup Requirements

### 1. Create Avatars Storage Bucket in Supabase

Go to your Supabase project:

1. Navigate to **Storage** → **Create a new bucket**
2. **Bucket name**: `avatars`
3. **Public bucket**: ✅ **YES** (check this box)
4. Click **Create bucket**

### 2. Set Bucket Policies

Run this SQL in your Supabase SQL Editor:

```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (so avatars can be displayed)
CREATE POLICY "Public avatar read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

---

## Basic Usage

### In Postman:

### Test 1: Upload Avatar

**Method:** `POST`  
**URL:** `http://localhost:3000/api/auth/avatar`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**

- Select **form-data** (NOT raw JSON!)
- Add field:
  - **Key**: `avatar` (select **File** from dropdown)
  - **Value**: Click "Select Files" and choose an image

**Click Send**

---

## Expected Response (Success)

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar_url": "https://npguberkdninaucofupy.supabase.co/storage/v1/object/public/avatars/8ab3d05d-92db-4ca7-857a-51ca102e5016/8ab3d05d-92db-4ca7-857a-51ca102e5016-1729449600000.jpg",
    "file_size": 245680,
    "file_size_mb": "0.23",
    "mime_type": "image/jpeg"
  }
}
```

✅ **Result:** Avatar uploaded and URL saved to user profile

---

## Test Scenarios

### Test 1: Upload Avatar (First Time)

**Steps:**

1. Login to get JWT token
2. Upload avatar image

**Request:**

```
POST /api/auth/avatar
Headers: Authorization: Bearer YOUR_JWT_TOKEN
Body: form-data with "avatar" field (image file)
```

**Expected:** ✅ Avatar uploaded successfully

**Server Console:**

```
📸 User test@example.com uploading avatar
📤 Uploading avatar: 8ab3d05d-92db-4ca7-857a-51ca102e5016-1729449600000.jpg
✅ Avatar uploaded: https://...
✅ User profile updated with avatar URL
```

---

### Test 2: Update Avatar (Replace Old)

**Steps:**

1. Upload a first avatar
2. Upload a different avatar

**Expected:**

- ✅ Old avatar deleted from storage
- ✅ New avatar uploaded
- ✅ User metadata updated with new URL

**Server Console:**

```
📸 User test@example.com uploading avatar
📤 Uploading avatar: 8ab3d05d-92db-4ca7-857a-51ca102e5016-1729449700000.png
🗑️  Deleted old avatar: avatars/8ab3d05d-92db-4ca7-857a-51ca102e5016/8ab3d05d-92db-4ca7-857a-51ca102e5016-1729449600000.jpg
✅ Avatar uploaded: https://...
✅ User profile updated with avatar URL
```

---

### Test 3: View Profile with Avatar

**Request:**

```
GET /api/auth/user
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "8ab3d05d-92db-4ca7-857a-51ca102e5016",
      "email": "test@example.com",
      "email_confirmed": true,
      "user_metadata": {
        "avatar_url": "https://npguberkdninaucofupy.supabase.co/storage/v1/object/public/avatars/..."
      },
      "created_at": "2025-10-20T10:00:00.000Z",
      "updated_at": "2025-10-20T16:30:00.000Z",
      ...
    }
  }
}
```

✅ **Result:** Avatar URL is in `user_metadata.avatar_url`

---

### Test 4: Delete Avatar

**Method:** `DELETE`  
**URL:** `http://localhost:3000/api/auth/avatar`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:** (empty)

**Response:**

```json
{
  "success": true,
  "message": "Avatar deleted successfully"
}
```

**Server Console:**

```
🗑️  User test@example.com deleting avatar
✅ Avatar deleted from storage: avatars/8ab3d05d-92db-4ca7-857a-51ca102e5016/...
✅ Avatar URL removed from user profile
```

✅ **Result:** Avatar file deleted and URL removed from profile

---

### Test 5: Access Avatar URL in Browser

**Steps:**

1. Upload avatar
2. Copy the `avatar_url` from response
3. Paste URL in browser

**Expected:** ✅ Image displays (publicly accessible)

---

## Error Scenarios

### ❌ Error 1: No File Uploaded

**Request:**

```
POST /api/auth/avatar
Headers: Authorization: Bearer YOUR_JWT_TOKEN
Body: (empty or no "avatar" field)
```

**Response:**

```json
{
  "success": false,
  "error": "No file uploaded",
  "message": "Please provide an image file"
}
```

**Status:** 400 Bad Request

---

### ❌ Error 2: Invalid File Type

**Request:** Upload a non-image file (PDF, TXT, etc.)

**Response:**

```json
{
  "success": false,
  "error": "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed."
}
```

**Status:** 400 Bad Request

---

### ❌ Error 3: File Too Large

**Request:** Upload image > 5MB

**Response:**

```json
{
  "success": false,
  "error": "File too large"
}
```

**Status:** 413 Payload Too Large

---

### ❌ Error 4: No Authentication

**Request without token:**

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

### ❌ Error 5: Delete When No Avatar Exists

**Request:**

```
DELETE /api/auth/avatar
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**

```json
{
  "success": false,
  "error": "No avatar found",
  "message": "User does not have an avatar to delete"
}
```

**Status:** 404 Not Found

---

## Testing Workflow

### Complete Avatar Upload Flow

**Step 1: Login**

```
POST /api/auth/login
Body: {
  "email": "test@example.com",
  "password": "password123"
}
```

Save the `access_token` from response.

---

**Step 2: View Current Profile**

```
GET /api/auth/user
Headers: Authorization: Bearer {access_token}
```

Check `user_metadata.avatar_url` - should be `null` or missing.

---

**Step 3: Upload Avatar**

```
POST /api/auth/avatar
Headers: Authorization: Bearer {access_token}
Body: form-data with "avatar" field (image file)
```

Save the `avatar_url` from response.

---

**Step 4: Verify Profile Updated**

```
GET /api/auth/user
Headers: Authorization: Bearer {access_token}
```

Check `user_metadata.avatar_url` - should contain the URL.

---

**Step 5: View Avatar in Browser**

Open `avatar_url` in browser - image should display.

---

**Step 6: Update Avatar**

```
POST /api/auth/avatar
Headers: Authorization: Bearer {access_token}
Body: form-data with "avatar" field (different image)
```

New URL should be different from old one.

---

**Step 7: Delete Avatar**

```
DELETE /api/auth/avatar
Headers: Authorization: Bearer {access_token}
```

---

**Step 8: Verify Deletion**

```
GET /api/auth/user
Headers: Authorization: Bearer {access_token}
```

Check `user_metadata.avatar_url` - should be `null`.

---

## Frontend Examples

### JavaScript/Fetch

```javascript
async function uploadAvatar(file) {
  const token = localStorage.getItem("token");

  const formData = new FormData();
  formData.append("avatar", file);

  try {
    const response = await fetch("/api/auth/avatar", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      console.log("Avatar uploaded:", data.data.avatar_url);
      return data.data.avatar_url;
    } else {
      console.error("Error:", data.error);
      alert(data.error);
      return null;
    }
  } catch (error) {
    console.error("Request failed:", error);
    alert("Failed to upload avatar");
    return null;
  }
}

// Usage with file input
document.getElementById("avatarInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    const avatarUrl = await uploadAvatar(file);
    if (avatarUrl) {
      // Update UI with new avatar
      document.getElementById("avatarImg").src = avatarUrl;
    }
  }
});
```

---

### React Example

```javascript
import { useState } from "react";

function AvatarUpload({ currentAvatarUrl, onAvatarUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setAvatarUrl(data.data.avatar_url);
        onAvatarUpdate(data.data.avatar_url);
        alert("Avatar uploaded successfully!");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete your avatar?")) return;

    setUploading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/avatar", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setAvatarUrl(null);
        onAvatarUpdate(null);
        alert("Avatar deleted successfully!");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to delete avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="avatar-upload">
      <div className="avatar-preview">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="avatar-img" />
        ) : (
          <div className="avatar-placeholder">No Avatar</div>
        )}
      </div>

      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={uploading}
        id="avatar-input"
      />

      <label htmlFor="avatar-input" className="btn-upload">
        {uploading
          ? "Uploading..."
          : avatarUrl
          ? "Change Avatar"
          : "Upload Avatar"}
      </label>

      {avatarUrl && (
        <button
          onClick={handleDelete}
          disabled={uploading}
          className="btn-delete"
        >
          Delete Avatar
        </button>
      )}
    </div>
  );
}
```

---

## File Storage Structure

Avatars are stored in user-specific folders:

```
avatars/
  └── {user_id}/
      ├── {user_id}-{timestamp}.jpg
      ├── {user_id}-{timestamp}.png
      └── ...
```

**Example:**

```
avatars/
  └── 8ab3d05d-92db-4ca7-857a-51ca102e5016/
      └── 8ab3d05d-92db-4ca7-857a-51ca102e5016-1729449600000.jpg
```

---

## Important Notes

### ✅ Automatic Old Avatar Cleanup

When uploading a new avatar, the old one is automatically deleted from storage to save space.

### 📏 File Size Limit

- **Maximum**: 5MB
- **Reason**: Avatars should be small for fast loading
- **Recommendation**: Compress images before upload

### 🎨 Supported Formats

- ✅ JPEG/JPG
- ✅ PNG
- ✅ WebP
- ✅ GIF

### 🔐 Security

- ✅ Requires authentication
- ✅ Users can only upload/delete their own avatars
- ✅ Storage RLS policies enforce user isolation
- ✅ Public read access (avatars are meant to be seen)

### 🌐 Public URLs

Avatar URLs are public, meaning anyone with the URL can view the image. This is intentional for profile pictures.

---

## Summary

**Upload Endpoint:** `POST /api/auth/avatar`

**Delete Endpoint:** `DELETE /api/auth/avatar`

**View Avatar:** `GET /api/auth/user` → `user_metadata.avatar_url`

**Features:**

- ✅ 5MB file size limit
- ✅ Image files only (JPEG, PNG, WebP, GIF)
- ✅ Automatic old avatar deletion
- ✅ User-specific storage
- ✅ Public URLs
- ✅ Stored in user metadata

**Storage:** `avatars/{user_id}/{user_id}-{timestamp}.{ext}`

---

Ready to test? Upload your first avatar! 📸
