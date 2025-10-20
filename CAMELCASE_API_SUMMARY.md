# camelCase API - Summary

## What Changed

Your API now uses **consistent camelCase** for all request/response fields! 🎉

---

## Request & Response Format

### ✅ Before (Inconsistent)

**Request:**

```json
{
  "firstName": "John"
}
```

**Response:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "avatar_url": "...",
  "created_at": "..."
}
```

❌ **Problem:** Request uses camelCase but response uses snake_case

---

### ✅ After (Consistent)

**Request:**

```json
{
  "firstName": "John"
}
```

**Response:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "avatarUrl": "...",
  "createdAt": "..."
}
```

✅ **Solution:** Both request and response use camelCase

---

## Updated Endpoints

### 1. **POST /api/auth/signup**

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "createdAt": "2025-10-20T10:00:00.000Z",
      "emailConfirmed": false
    },
    "session": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresAt": 1234567890
    },
    "emailConfirmationRequired": true
  }
}
```

**Changed Fields:**

- `first_name` → `firstName`
- `last_name` → `lastName`
- `full_name` → `fullName`
- `created_at` → `createdAt`
- `email_confirmed` → `emailConfirmed`
- `access_token` → `accessToken`
- `refresh_token` → `refreshToken`
- `expires_at` → `expiresAt`
- `email_confirmation_required` → `emailConfirmationRequired`

---

### 2. **POST /api/auth/login**

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "emailConfirmed": true,
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "avatarUrl": "https://...",
      "createdAt": "2025-10-20T10:00:00.000Z"
    },
    "session": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresAt": 1234567890,
      "expiresIn": 3600
    }
  }
}
```

**Changed Fields:**

- `email_confirmed` → `emailConfirmed`
- `first_name` → `firstName`
- `last_name` → `lastName`
- `full_name` → `fullName`
- `avatar_url` → `avatarUrl`
- `created_at` → `createdAt`
- `access_token` → `accessToken`
- `refresh_token` → `refreshToken`
- `expires_at` → `expiresAt`
- `expires_in` → `expiresIn`

---

### 3. **POST /api/auth/refresh**

**Request:**

```json
{
  "refresh_token": "..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "session": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresAt": 1234567890,
      "expiresIn": 3600
    },
    "user": {
      "id": "user-id",
      "email": "user@example.com"
    }
  }
}
```

⚠️ **Note:** Request still uses `refresh_token` (snake_case) because that's what Supabase expects.

**Changed Fields:**

- `access_token` → `accessToken`
- `refresh_token` → `refreshToken` (in response only)
- `expires_at` → `expiresAt`
- `expires_in` → `expiresIn`

---

### 4. **GET /api/user/profile**

**Request:**

```
GET /api/user/profile
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
      "emailConfirmed": true,
      "phone": null,
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "avatarUrl": "https://...",
      "createdAt": "2025-10-20T10:00:00.000Z",
      "updatedAt": "2025-10-20T15:00:00.000Z",
      "lastSignInAt": "2025-10-20T14:00:00.000Z"
    }
  }
}
```

**Changed Fields:**

- `email_confirmed` → `emailConfirmed`
- `first_name` → `firstName`
- `last_name` → `lastName`
- `full_name` → `fullName`
- `avatar_url` → `avatarUrl`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`
- `last_sign_in_at` → `lastSignInAt`

---

### 5. **POST /api/user/update-profile**

**Request:**

```json
{
  "firstName": "Jonathan",
  "lastName": "Smith"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "Jonathan",
      "lastName": "Smith",
      "fullName": "Jonathan Smith",
      "avatarUrl": "https://...",
      "updatedAt": "2025-10-20T16:00:00.000Z"
    }
  }
}
```

**Changed Fields:**

- `first_name` → `firstName`
- `last_name` → `lastName`
- `full_name` → `fullName`
- `avatar_url` → `avatarUrl`
- `updated_at` → `updatedAt`

---

### 6. **POST /api/user/avatar**

**Request:**

```
POST /api/user/avatar
Content-Type: multipart/form-data

avatar: [image file]
```

**Response:**

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatarUrl": "https://...supabase.co/.../avatar.jpg",
    "fileSize": 245678,
    "fileSizeMb": "0.23",
    "mimeType": "image/jpeg"
  }
}
```

**Changed Fields:**

- `avatar_url` → `avatarUrl`
- `file_size` → `fileSize`
- `file_size_mb` → `fileSizeMb`
- `mime_type` → `mimeType`

---

## Internal Storage (Unchanged)

Supabase `user_metadata` still uses snake_case internally:

```json
{
  "user_metadata": {
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "avatar_url": "https://..."
  }
}
```

This is fine! The API layer transforms it to camelCase automatically.

---

## Migration Notes

### Breaking Changes ⚠️

If you have a frontend already using the API, you'll need to update field names:

**Before:**

```javascript
const userName = user.first_name;
const userAvatar = user.avatar_url;
const token = session.access_token;
```

**After:**

```javascript
const userName = user.firstName;
const userAvatar = user.avatarUrl;
const token = session.accessToken;
```

---

## Frontend Examples

### React - Display User Name

```javascript
function UserProfile({ user }) {
  return (
    <div>
      <h1>Welcome, {user.fullName || user.email}!</h1>

      {user.avatarUrl && <img src={user.avatarUrl} alt={user.fullName} />}

      <p>Email: {user.email}</p>
      {user.firstName && <p>First Name: {user.firstName}</p>}
      {user.lastName && <p>Last Name: {user.lastName}</p>}

      <p>Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
    </div>
  );
}
```

---

### JavaScript - Update Profile

```javascript
async function updateProfile(firstName, lastName) {
  const token = localStorage.getItem("token");

  const response = await fetch("/api/user/update-profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName, // camelCase!
      lastName, // camelCase!
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("Updated:", data.data.user.fullName); // camelCase!
  }
}
```

---

### JavaScript - Store Token

```javascript
async function login(email, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (data.success) {
    // Store tokens (camelCase!)
    localStorage.setItem("accessToken", data.data.session.accessToken);
    localStorage.setItem("refreshToken", data.data.session.refreshToken);

    // Access user data (camelCase!)
    const user = data.data.user;
    console.log("Welcome,", user.fullName);
    console.log("Avatar:", user.avatarUrl);
  }
}
```

---

## Benefits of camelCase

✅ **Consistent** - Same naming convention for requests and responses  
✅ **JavaScript-friendly** - Matches JavaScript/TypeScript conventions  
✅ **Better DX** - No mental switching between snake_case and camelCase  
✅ **Industry Standard** - Most REST APIs use camelCase (Google, Stripe, etc.)  
✅ **TypeScript-ready** - Easier to type interfaces

---

## All Field Mappings

| Old (snake_case)              | New (camelCase)             |
| ----------------------------- | --------------------------- |
| `first_name`                  | `firstName`                 |
| `last_name`                   | `lastName`                  |
| `full_name`                   | `fullName`                  |
| `avatar_url`                  | `avatarUrl`                 |
| `email_confirmed`             | `emailConfirmed`            |
| `email_confirmation_required` | `emailConfirmationRequired` |
| `created_at`                  | `createdAt`                 |
| `updated_at`                  | `updatedAt`                 |
| `last_sign_in_at`             | `lastSignInAt`              |
| `access_token`                | `accessToken`               |
| `refresh_token`               | `refreshToken`              |
| `expires_at`                  | `expiresAt`                 |
| `expires_in`                  | `expiresIn`                 |
| `file_size`                   | `fileSize`                  |
| `file_size_mb`                | `fileSizeMb`                |
| `mime_type`                   | `mimeType`                  |

---

## Testing

Test the updated profile endpoint:

```bash
POST http://localhost:3000/api/user/update-profile
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "firstName": "123sdf"
}
```

Expected response:

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "firstName": "123sdf",
      "lastName": "Account",
      "fullName": "123sdf Account",
      ...
    }
  }
}
```

✅ **No more inconsistency!** Request and response both use camelCase.

---

## Summary

**What Changed:**

- ✅ All API responses now use camelCase
- ✅ Requests already used camelCase
- ✅ Internal storage still uses snake_case (Supabase)
- ✅ Automatic transformation in response layer

**Files Updated:**

- `routes/auth.js` - signup, login, refresh responses
- `routes/user.js` - profile, update-profile, avatar responses

**Result:** Consistent, JavaScript-friendly API! 🎉

---

Ready to test! Try your update-profile request again and see the camelCase response! 🚀
