# Testing User Profile with Name Fields

## Overview

Users can now add and update their first name and last name. These are stored in `user_metadata` and automatically combined into a `full_name` field.

---

## Features

- ✅ Add firstName and lastName during signup
- ✅ Update firstName and lastName separately
- ✅ Automatic full_name generation
- ✅ Retrieved with login and profile endpoints
- ✅ Preserved when updating avatar

---

## API Endpoints

### 1. Signup with Name

**Endpoint:** `POST /api/auth/signup`

**Request:**

```json
{
  "email": "john.doe@example.com",
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
      "email": "john.doe@example.com",
      "user_metadata": {
        "first_name": "John",
        "last_name": "Doe",
        "full_name": "John Doe"
      },
      ...
    },
    "session": {
      "access_token": "...",
      "refresh_token": "...",
      ...
    }
  }
}
```

✅ **Note:** firstName and lastName are optional during signup.

---

### 2. Login Returns Name

**Endpoint:** `POST /api/auth/login`

**Request:**

```json
{
  "email": "john.doe@example.com",
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
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "avatar_url": null,
      "user_metadata": {
        "first_name": "John",
        "last_name": "Doe",
        "full_name": "John Doe"
      },
      ...
    },
    "session": { ... }
  }
}
```

---

### 3. Get User Profile

**Endpoint:** `GET /api/auth/user`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "john.doe@example.com",
      "email_confirmed": true,
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "avatar_url": "https://...supabase.co/.../avatar.jpg",
      "user_metadata": {
        "first_name": "John",
        "last_name": "Doe",
        "full_name": "John Doe",
        "avatar_url": "..."
      },
      "created_at": "2025-10-20T10:00:00.000Z",
      "updated_at": "2025-10-20T12:00:00.000Z",
      ...
    }
  }
}
```

---

### 4. Update Profile Name

**Endpoint:** `POST /api/auth/update-profile`

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request - Update Both:**

```json
{
  "firstName": "Jonathan",
  "lastName": "Smith"
}
```

**Request - Update First Name Only:**

```json
{
  "firstName": "Jonathan"
}
```

**Request - Update Last Name Only:**

```json
{
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
      "email": "john.doe@example.com",
      "first_name": "Jonathan",
      "last_name": "Smith",
      "full_name": "Jonathan Smith",
      "avatar_url": "...",
      "updated_at": "2025-10-20T15:30:00.000Z"
    }
  }
}
```

---

## Test Scenarios

### Scenario 1: Signup with Full Name

**Test:**

```
POST /api/auth/signup
Body: {
  "email": "jane.doe@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**Expected:**

- ✅ User created
- ✅ `first_name` = "Jane"
- ✅ `last_name` = "Doe"
- ✅ `full_name` = "Jane Doe"

---

### Scenario 2: Signup with First Name Only

**Test:**

```
POST /api/auth/signup
Body: {
  "email": "bob@example.com",
  "password": "password123",
  "firstName": "Bob"
}
```

**Expected:**

- ✅ User created
- ✅ `first_name` = "Bob"
- ✅ `last_name` = null
- ✅ `full_name` = "Bob"

---

### Scenario 3: Signup Without Name

**Test:**

```
POST /api/auth/signup
Body: {
  "email": "user@example.com",
  "password": "password123"
}
```

**Expected:**

- ✅ User created
- ✅ `first_name` = null
- ✅ `last_name` = null
- ✅ `full_name` = null

---

### Scenario 4: Update First Name

**Test:**

```
POST /api/auth/update-profile
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "firstName": "Bobby"
}
```

**Expected:**

- ✅ `first_name` updated to "Bobby"
- ✅ `last_name` unchanged
- ✅ `full_name` recalculated (e.g., "Bobby Smith")
- ✅ `avatar_url` preserved

---

### Scenario 5: Update Last Name

**Test:**

```
POST /api/auth/update-profile
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "lastName": "Johnson"
}
```

**Expected:**

- ✅ `first_name` unchanged
- ✅ `last_name` updated to "Johnson"
- ✅ `full_name` recalculated

---

### Scenario 6: Update Both Names

**Test:**

```
POST /api/auth/update-profile
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "firstName": "Michael",
  "lastName": "Jordan"
}
```

**Expected:**

- ✅ Both names updated
- ✅ `full_name` = "Michael Jordan"

---

### Scenario 7: Clear First Name

**Test:**

```
POST /api/auth/update-profile
Headers: Authorization: Bearer YOUR_TOKEN
Body: {
  "firstName": ""
}
```

**Expected:**

- ✅ `first_name` = ""
- ✅ `full_name` recalculated (e.g., just last name)

---

## Error Scenarios

### ❌ Error 1: No Fields Provided

**Request:**

```json
{}
```

**Response:**

```json
{
  "success": false,
  "error": "No updates provided",
  "message": "Please provide at least one field to update: firstName or lastName"
}
```

**Status:** 400 Bad Request

---

### ❌ Error 2: Invalid firstName Type

**Request:**

```json
{
  "firstName": 12345
}
```

**Response:**

```json
{
  "success": false,
  "error": "Invalid firstName format",
  "message": "firstName must be a string"
}
```

**Status:** 400 Bad Request

---

### ❌ Error 3: Invalid lastName Type

**Request:**

```json
{
  "lastName": true
}
```

**Response:**

```json
{
  "success": false,
  "error": "Invalid lastName format",
  "message": "lastName must be a string"
}
```

**Status:** 400 Bad Request

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

## Server Console Logs

### Successful Profile Update

```
👤 User john.doe@example.com updating profile
✅ Profile updated successfully for user john.doe@example.com
```

---

## Complete Testing Workflow

### Step 1: Signup with Name

```
POST /api/auth/signup
Body: {
  "email": "test@example.com",
  "password": "password123",
  "firstName": "Test",
  "lastName": "User"
}
```

Save the `access_token` from response.

---

### Step 2: Verify Name in Profile

```
GET /api/auth/user
Headers: Authorization: Bearer {access_token}
```

Check that `first_name`, `last_name`, and `full_name` are returned.

---

### Step 3: Update First Name

```
POST /api/auth/update-profile
Headers: Authorization: Bearer {access_token}
Body: {
  "firstName": "Testing"
}
```

---

### Step 4: Verify Update

```
GET /api/auth/user
Headers: Authorization: Bearer {access_token}
```

Check that `first_name` = "Testing", `last_name` unchanged, `full_name` = "Testing User".

---

### Step 5: Update Last Name

```
POST /api/auth/update-profile
Headers: Authorization: Bearer {access_token}
Body: {
  "lastName": "Account"
}
```

---

### Step 6: Verify Both Names

```
GET /api/auth/user
Headers: Authorization: Bearer {access_token}
```

Check that `full_name` = "Testing Account".

---

## Frontend Examples

### JavaScript/Fetch - Signup with Name

```javascript
async function signup(email, password, firstName, lastName) {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName,
    }),
  });

  const data = await response.json();

  if (data.success) {
    // Save token
    localStorage.setItem("token", data.data.session.access_token);

    // Access user data
    console.log("Welcome,", data.data.user.full_name);
  }

  return data;
}
```

---

### React - Update Profile Form

```javascript
import { useState } from "react";

function ProfileForm({ currentFirstName, currentLastName }) {
  const [firstName, setFirstName] = useState(currentFirstName || "");
  const [lastName, setLastName] = useState(currentLastName || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Profile updated!");
        console.log("New full name:", data.data.user.full_name);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>First Name:</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="John"
        />
      </div>

      <div>
        <label>Last Name:</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Doe"
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Updating..." : "Update Profile"}
      </button>
    </form>
  );
}
```

---

### Display User Name

```javascript
function UserGreeting({ user }) {
  // Use full_name if available, otherwise email
  const displayName = user.full_name || user.email;

  return (
    <div>
      <h1>Welcome, {displayName}!</h1>

      {user.avatar_url && <img src={user.avatar_url} alt={displayName} />}

      <p>Email: {user.email}</p>
      {user.first_name && <p>First Name: {user.first_name}</p>}
      {user.last_name && <p>Last Name: {user.last_name}</p>}
    </div>
  );
}
```

---

## Data Structure

### Stored in Supabase Auth

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "user_metadata": {
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "avatar_url": "https://..."
  }
}
```

### Returned by API

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "user_metadata": { ... }
}
```

---

## Important Notes

### ✅ Automatic full_name Generation

When you update `firstName` or `lastName`, the `full_name` is automatically recalculated:

- If both: "John Doe"
- If only first: "John"
- If only last: "Doe"
- If neither: null

### ✅ Trimming

Names are automatically trimmed of leading/trailing whitespace.

### ✅ Preserved Fields

Updating names doesn't affect:

- ✅ avatar_url
- ✅ Other user_metadata fields
- ✅ Email or password

### ✅ Optional Fields

firstName and lastName are completely optional:

- ✅ Can signup without them
- ✅ Can update just one
- ✅ Can leave them empty

---

## Summary

**Fields Added:**

- `first_name` - User's first name
- `last_name` - User's last name
- `full_name` - Auto-generated from first + last

**Endpoints Updated:**

- ✅ `POST /api/auth/signup` - Accept firstName, lastName
- ✅ `POST /api/auth/login` - Return name fields
- ✅ `GET /api/auth/user` - Return name fields
- ✅ `POST /api/auth/update-profile` - Update firstName, lastName

**Storage:** `user_metadata` in Supabase Auth

---

Ready to test? Try creating a user with a name! 👤
