# 📚 Complete API Endpoint Reference

All available endpoints in the Caption Studio Backend.

## ✅ Authentication Endpoints

| Method | Endpoint            | Auth Required | Description          |
| ------ | ------------------- | ------------- | -------------------- |
| POST   | `/api/auth/signup`  | ❌            | Register new user    |
| POST   | `/api/auth/login`   | ❌            | Login user           |
| POST   | `/api/auth/logout`  | ❌            | Logout user          |
| POST   | `/api/auth/refresh` | ❌            | Refresh access token |
| POST   | `/api/auth/verify`  | ❌            | Verify current token |

**Rate Limit:** 5 requests per 15 minutes

---

## 👤 User Profile Endpoints

| Method | Endpoint                   | Auth Required | Description          |
| ------ | -------------------------- | ------------- | -------------------- |
| GET    | `/api/user/profile`        | ✅            | Get user profile     |
| POST   | `/api/user/update-profile` | ✅            | Update name fields   |
| POST   | `/api/user/avatar`         | ✅            | Upload/update avatar |
| DELETE | `/api/user/avatar`         | ✅            | Delete avatar        |

**Rate Limit:** 100 requests per 15 minutes

---

## 📤 Upload Endpoints

| Method | Endpoint                              | Auth Required | Description                          |
| ------ | ------------------------------------- | ------------- | ------------------------------------ |
| POST   | `/api/upload/image`                   | ✅            | Upload single image (no AI)          |
| POST   | `/api/upload/upload-and-analyze`      | ✅            | Upload + AI analysis (single)        |
| POST   | `/api/upload/bulk-upload-and-analyze` | ✅            | Bulk upload + AI analysis (up to 10) |
| POST   | `/api/upload/analyze/:id`             | ✅            | Analyze existing image by ID         |

**Limits:**

- Max file size: 10MB
- Max bulk upload: 10 images
- Allowed formats: JPEG, PNG, GIF, WebP

**Rate Limit:** 100 requests per 15 minutes

---

## 📁 File Management Endpoints

| Method | Endpoint                    | Auth Required | Description                               |
| ------ | --------------------------- | ------------- | ----------------------------------------- |
| GET    | `/api/files/`               | ✅            | List all user files (paginated)           |
| GET    | `/api/files/images`         | ✅            | List images only                          |
| GET    | `/api/files/stats`          | ✅            | File statistics                           |
| GET    | `/api/files/search`         | ✅            | Search files (with sorting support)       |
| GET    | `/api/files/:id`            | ✅            | Get single file by ID                     |
| GET    | `/api/files/:id/download`   | ✅            | Download single file                      |
| PATCH  | `/api/files/:id`            | ✅            | Update file (filename, description, tags) |
| DELETE | `/api/files/:id`            | ✅            | Delete single file                        |
| POST   | `/api/files/:id/regenerate` | ✅            | Regenerate AI analysis for single file    |

**Rate Limit:** 100 requests per 15 minutes

---

## 🔄 Bulk Operations Endpoints

| Method | Endpoint                | Auth Required | Description                                     |
| ------ | ----------------------- | ------------- | ----------------------------------------------- |
| PATCH  | `/api/files`            | ✅            | Bulk update files (filename, description, tags) |
| POST   | `/api/files/download`   | ✅            | Bulk download files as ZIP (up to 100 files)    |
| DELETE | `/api/files`            | ✅            | Bulk delete (up to 100 files)                   |
| POST   | `/api/files/regenerate` | ✅            | Bulk regenerate AI (up to 20 files)             |

**Limits:**

- Bulk update: 50 files max
- Bulk download: 100 files max
- Bulk delete: 100 files max
- Bulk regenerate: 20 files max

**Rate Limit:** 100 requests per 15 minutes

---

## 🩺 System Health Endpoints

| Method | Endpoint  | Auth Required | Description                   |
| ------ | --------- | ------------- | ----------------------------- |
| GET    | `/`       | ❌            | Basic server info             |
| GET    | `/health` | ❌            | Health check (status, uptime) |

**No Rate Limit**

---

## 📊 Quick Stats

- **Total Endpoints:** 28
- **Authentication Required:** 23
- **Public Endpoints:** 5
- **Routes Files:** 4 (auth, user, upload, files)
- **Rate Limited:** All `/api/*` endpoints

---

## 🔐 Authentication

Most endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Get your token from `/api/auth/login` or `/api/auth/signup`.

---

## 📝 Response Format

All endpoints return JSON with this structure:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": "More specific error details"
}
```

---

## 🚀 Usage Example

```javascript
// Login
const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "user@example.com",
    password: "SecurePassword123!",
  }),
});

const { data } = await loginResponse.json();
const accessToken = data.session.access_token;

// Use token for authenticated requests
const filesResponse = await fetch("http://localhost:3000/api/files/", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

const files = await filesResponse.json();
```

---

## 🔗 Related Documentation

- **README.md** - Full project documentation
- **STORAGE_URL_FIX.md** - Storage URL troubleshooting
- **ARCHITECTURE.md** - System architecture details
- **SECURITY_SUMMARY.md** - Security features and best practices

---

**Last Updated:** 2025-10-29
