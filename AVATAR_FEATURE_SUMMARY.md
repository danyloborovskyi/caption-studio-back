# Avatar Upload Feature - Summary

## What Was Added

✅ **New Endpoints:**

- `POST /api/auth/avatar` - Upload or update user avatar
- `DELETE /api/auth/avatar` - Delete user avatar

Allows authenticated users to upload, update, and delete profile avatars.

---

## Key Features

### 1. Avatar Upload

- Upload profile pictures
- Automatically replace old avatar when uploading new one
- User-specific storage folders
- Public avatar URLs for display

### 2. Security

- ✅ Requires authentication (JWT token)
- ✅ User-specific RLS policies
- ✅ Can only upload/delete YOUR own avatar
- ✅ Public read access (avatars are meant to be displayed)

### 3. Validation

- ✅ File size limit: 5MB
- ✅ Allowed formats: JPEG, PNG, WebP, GIF
- ✅ Image files only
- ✅ Validates file type before upload

### 4. Automatic Cleanup

- ✅ Old avatars automatically deleted when uploading new one
- ✅ Saves storage space
- ✅ Only one avatar per user

---

## API Endpoints

### Upload/Update Avatar

```
POST /api/auth/avatar
Headers: Authorization: Bearer {token}
Body: form-data with "avatar" field (image file)
```

**Response:**

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar_url": "https://...supabase.co/.../avatars/user-id/file.jpg",
    "file_size": 245680,
    "file_size_mb": "0.23",
    "mime_type": "image/jpeg"
  }
}
```

---

### Delete Avatar

```
DELETE /api/auth/avatar
Headers: Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "message": "Avatar deleted successfully"
}
```

---

### View Profile with Avatar

```
GET /api/auth/user
Headers: Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "user_metadata": {
        "avatar_url": "https://...supabase.co/.../avatars/user-id/file.jpg"
      },
      ...
    }
  }
}
```

---

## Storage Structure

Avatars are organized by user ID:

```
avatars/
  └── {user_id}/
      └── {user_id}-{timestamp}.{ext}
```

**Example:**

```
avatars/
  └── 8ab3d05d-92db-4ca7-857a-51ca102e5016/
      └── 8ab3d05d-92db-4ca7-857a-51ca102e5016-1729449600000.jpg
```

---

## Setup Requirements

### 1. Create Storage Bucket

In Supabase Dashboard:

1. Go to **Storage** → **Create bucket**
2. Name: `avatars`
3. **Public**: ✅ Check this box
4. Create bucket

### 2. Apply Storage Policies

Run the SQL in `database/avatar-storage-setup.sql`:

```sql
-- Allow users to upload their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to read avatars
CREATE POLICY "Public avatar read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

---

## Use Cases

1. **Profile Pictures** - Display user avatars across the app
2. **User Identity** - Visual identification of users
3. **Personalization** - Let users customize their profile
4. **Comments/Reviews** - Show avatars next to user content
5. **Team Members** - Display team/staff photos

---

## Technical Details

### File Size Limit

- **Maximum**: 5MB
- **Reason**: Fast loading and reasonable storage
- **Recommendation**: Compress images on frontend before upload

### Supported Formats

- ✅ JPEG/JPG
- ✅ PNG
- ✅ WebP (recommended for best compression)
- ✅ GIF

### Storage Location

- **Bucket**: `avatars` (public)
- **Path**: `avatars/{user_id}/{user_id}-{timestamp}.{ext}`
- **Access**: Public URLs (anyone with URL can view)

### Avatar URL Storage

Avatar URL is stored in `user.user_metadata.avatar_url`:

- Automatically updated on upload
- Set to `null` on delete
- Retrieved with `GET /api/auth/user`

---

## Server Console Logs

### Upload Success

```
📸 User test@example.com uploading avatar
📤 Uploading avatar: 8ab3d05d-...-1729449600000.jpg
🗑️  Deleted old avatar: avatars/8ab3d05d-.../old-file.jpg
✅ Avatar uploaded: https://...
✅ User profile updated with avatar URL
```

### Delete Success

```
🗑️  User test@example.com deleting avatar
✅ Avatar deleted from storage: avatars/8ab3d05d-.../file.jpg
✅ Avatar URL removed from user profile
```

---

## Error Handling

| Error             | Status | Reason                               |
| ----------------- | ------ | ------------------------------------ |
| No file uploaded  | 400    | Missing "avatar" field in form-data  |
| Invalid file type | 400    | Not an image file                    |
| File too large    | 413    | File > 5MB                           |
| No authentication | 401    | Missing or invalid JWT token         |
| No avatar found   | 404    | Trying to delete non-existent avatar |
| Upload failed     | 500    | Supabase Storage error               |

---

## Security Features

✅ **Authentication Required** - Must have valid JWT token  
✅ **User Isolation** - RLS policies enforce user-specific access  
✅ **Storage Policies** - Can only upload/delete own avatars  
✅ **Public URLs** - Avatars are publicly accessible (intended)  
✅ **Automatic Cleanup** - Old avatars deleted on update

---

## Frontend Integration

### Simple Upload Example

```javascript
async function uploadAvatar(file) {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch("/api/auth/avatar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  return response.json();
}
```

### React Component Example

```javascript
function AvatarUpload() {
  const [avatar, setAvatar] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = await uploadAvatar(file);
    if (data.success) {
      setAvatar(data.data.avatar_url);
    }
  };

  return (
    <div>
      {avatar && <img src={avatar} alt="Avatar" />}
      <input type="file" accept="image/*" onChange={handleUpload} />
    </div>
  );
}
```

---

## Testing

See `TEST_AVATAR_UPLOAD.md` for:

- ✅ Step-by-step Postman testing
- ✅ Complete upload/update/delete workflow
- ✅ Error scenario testing
- ✅ Frontend code examples
- ✅ Security verification

---

## Updated API Endpoints

Complete authentication system:

```
POST   /api/auth/signup              - Create new user
POST   /api/auth/login               - Login
POST   /api/auth/logout              - Logout
POST   /api/auth/refresh             - Refresh token
GET    /api/auth/user                - Get profile (includes avatar_url)
POST   /api/auth/forgot-password     - Password reset
POST   /api/auth/reset-password      - Reset password
PUT    /api/auth/update-password     - Update password
PUT    /api/auth/update-profile      - Update profile
POST   /api/auth/avatar              - Upload/update avatar ⭐ NEW!
DELETE /api/auth/avatar              - Delete avatar ⭐ NEW!
```

---

## Documentation Files

- **`TEST_AVATAR_UPLOAD.md`** - Complete testing guide with examples
- **`database/avatar-storage-setup.sql`** - SQL setup script
- **`AUTH_SETUP.md`** - Updated with avatar endpoints
- **`SETUP_COMPLETE.md`** - Updated API endpoints list

---

## What's Complete

✅ **Authentication System** - Signup, login, logout, password reset, profile update  
✅ **Avatar Upload** - **NEW!** Upload, update, delete profile pictures  
✅ **File Upload** - Single + bulk upload with AI analysis  
✅ **File Storage** - User-specific folders in Supabase Storage  
✅ **File Retrieval** - List, search, get single file  
✅ **File Update** - Manual editing + AI regeneration  
✅ **File Delete** - Remove files from storage and database  
✅ **User Isolation** - RLS policies on database and storage  
✅ **Security** - JWT authentication, ownership verification

---

## Production Recommendations

### 1. Image Optimization

Consider frontend optimization:

- Resize images before upload (e.g., max 500x500px for avatars)
- Compress images to reduce file size
- Use WebP format for best compression

### 2. CDN Integration

For better performance:

- Use Supabase's built-in CDN
- Consider additional CDN for global distribution
- Cache avatar URLs on frontend

### 3. Default Avatars

Implement fallback avatars:

```javascript
const avatarUrl = user.user_metadata?.avatar_url || "/default-avatar.png";
```

### 4. Rate Limiting

Consider limiting avatar uploads:

- Max 10 uploads per day per user
- Prevent abuse and storage bloat

---

## Ready for Production! 🚀

Your Caption Studio backend now has complete user profile management:

- ✅ Full authentication system
- ✅ Profile avatars with upload/update/delete
- ✅ File management with AI
- ✅ User-specific data isolation
- ✅ Secure API endpoints

**Next:** Connect frontend and deploy! 🎉
