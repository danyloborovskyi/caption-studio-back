# Authentication Setup Guide

This guide explains how to set up and use the Supabase authentication system in Caption Studio Backend.

## 📋 Table of Contents

- [Setup](#setup)
- [API Endpoints](#api-endpoints)
- [Authentication Middleware](#authentication-middleware)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

---

## 🔧 Setup

### 1. Configure Supabase

In your Supabase dashboard:

1. Go to **Authentication** → **Settings**
2. Configure your email templates (optional)
3. Enable/disable email confirmation as needed
4. Set up redirect URLs for password reset

### 2. Environment Variables

Add these to your `.env` file (use `env.template` as reference):

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
FRONTEND_URL=http://localhost:3000
```

**Where to find these:**

- Go to your Supabase project
- Navigate to: **Settings** → **API**
- Copy the Project URL and API keys

⚠️ **Security Note:** Never commit the `.env` file to version control!

---

## 🔐 API Endpoints

### Base URL: `/api/auth`

| Method | Endpoint           | Description                     | Auth Required |
| ------ | ------------------ | ------------------------------- | ------------- |
| `POST` | `/signup`          | Register a new user             | ❌            |
| `POST` | `/login`           | Login with email/password       | ❌            |
| `POST` | `/logout`          | Logout and revoke token         | ✅            |
| `POST` | `/refresh`         | Refresh access token            | ❌            |
| `GET`  | `/user`            | Get current user profile        | ✅            |
| `POST` | `/forgot-password` | Send password reset email       | ❌            |
| `POST` | `/reset-password`  | Reset password with token       | ❌            |
| `POST` | `/update-password` | Update password (authenticated) | ✅            |
| `POST` | `/update-profile`  | Update user metadata            | ✅            |

---

## 📝 API Documentation

### 1. Sign Up

Register a new user account.

**Endpoint:** `POST /api/auth/signup`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "metadata": {
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg"
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "email_confirmed": false
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_at": 1234567890
    },
    "email_confirmation_required": true
  }
}
```

---

### 2. Login

Authenticate with email and password.

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "email_confirmed": true,
      "user_metadata": {
        "full_name": "John Doe"
      },
      "created_at": "2024-01-01T00:00:00Z"
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_at": 1234567890,
      "expires_in": 3600
    }
  }
}
```

---

### 3. Logout

Revoke the user's refresh token.

**Endpoint:** `POST /api/auth/logout`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 4. Refresh Token

Get a new access token using a refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**

```json
{
  "refresh_token": "refresh_token_here"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "session": {
      "access_token": "new_jwt_token",
      "refresh_token": "new_refresh_token",
      "expires_at": 1234567890,
      "expires_in": 3600
    },
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

---

### 5. Get User Profile

Retrieve the authenticated user's profile.

**Endpoint:** `GET /api/auth/user`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "email_confirmed": true,
      "phone": null,
      "user_metadata": {
        "full_name": "John Doe"
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "last_sign_in_at": "2024-01-01T12:00:00Z"
    }
  }
}
```

---

### 6. Forgot Password

Send a password reset email.

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password reset email sent. Please check your inbox."
}
```

---

### 7. Reset Password

Reset password using the token from the reset email.

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**

```json
{
  "access_token": "token_from_reset_email",
  "new_password": "NewSecurePassword123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password."
}
```

---

### 8. Update Password (Authenticated)

Change password while logged in.

**Endpoint:** `POST /api/auth/update-password`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "current_password": "CurrentPassword123",
  "new_password": "NewPassword123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### 9. Update Profile

Update user metadata.

**Endpoint:** `POST /api/auth/update-profile`

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "metadata": {
    "full_name": "Jane Doe",
    "avatar_url": "https://example.com/new-avatar.jpg",
    "bio": "Software developer"
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_metadata": {
        "full_name": "Jane Doe",
        "avatar_url": "https://example.com/new-avatar.jpg",
        "bio": "Software developer"
      },
      "updated_at": "2024-01-01T12:00:00Z"
    }
  }
}
```

---

## 🔒 Authentication Middleware

The backend provides several middleware functions to protect your routes.

### Available Middleware

Located in `middleware/auth.js`:

1. **`authenticateUser`** - Require valid JWT token
2. **`optionalAuth`** - Attach user if token exists (doesn't block)
3. **`requireEmailConfirmed`** - Require confirmed email
4. **`requireRole`** - Require specific user role

### Usage Examples

#### Protect a Single Route

```javascript
const { authenticateUser } = require("../middleware/auth");

// Only authenticated users can access this
router.get("/protected", authenticateUser, (req, res) => {
  res.json({
    message: "This is protected data",
    user: req.user, // User object is available here
  });
});
```

#### Protect All Routes in a File

```javascript
const { authenticateUser } = require("../middleware/auth");

// Apply to all routes in this router
router.use(authenticateUser);

router.get("/profile", (req, res) => {
  // All routes here are protected
  res.json({ user: req.user });
});
```

#### Optional Authentication

```javascript
const { optionalAuth } = require("../middleware/auth");

// User data available if logged in, but route is public
router.get("/posts", optionalAuth, (req, res) => {
  const isLoggedIn = !!req.user;

  // Show personalized content if logged in
  if (isLoggedIn) {
    return res.json({ posts: getPersonalizedPosts(req.user.id) });
  }

  // Show public content if not logged in
  res.json({ posts: getPublicPosts() });
});
```

#### Require Email Confirmation

```javascript
const {
  authenticateUser,
  requireEmailConfirmed,
} = require("../middleware/auth");

// Must be logged in AND have confirmed email
router.post(
  "/premium-feature",
  authenticateUser,
  requireEmailConfirmed,
  (req, res) => {
    res.json({ message: "Premium feature accessed" });
  }
);
```

#### Role-Based Access Control

```javascript
const { authenticateUser, requireRole } = require("../middleware/auth");

// Only admins can access this
router.delete(
  "/users/:id",
  authenticateUser,
  requireRole(["admin"]),
  (req, res) => {
    // Delete user logic
  }
);

// Admins and moderators can access this
router.post(
  "/moderate",
  authenticateUser,
  requireRole(["admin", "moderator"]),
  (req, res) => {
    // Moderation logic
  }
);
```

---

## 💻 Frontend Usage Examples

### JavaScript/Fetch

#### Sign Up

```javascript
async function signUp(email, password) {
  const response = await fetch("http://localhost:3000/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      metadata: {
        full_name: "John Doe",
      },
    }),
  });

  const data = await response.json();

  if (data.success) {
    // Store tokens
    localStorage.setItem("access_token", data.data.session.access_token);
    localStorage.setItem("refresh_token", data.data.session.refresh_token);
  }

  return data;
}
```

#### Login

```javascript
async function login(email, password) {
  const response = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem("access_token", data.data.session.access_token);
    localStorage.setItem("refresh_token", data.data.session.refresh_token);
  }

  return data;
}
```

#### Make Authenticated Request

```javascript
async function getProtectedData() {
  const token = localStorage.getItem("access_token");

  const response = await fetch("http://localhost:3000/api/protected-route", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return await response.json();
}
```

#### Get User Profile

```javascript
async function getUserProfile() {
  const token = localStorage.getItem("access_token");

  const response = await fetch("http://localhost:3000/api/auth/user", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
}
```

#### Refresh Token

```javascript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");

  const response = await fetch("http://localhost:3000/api/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem("access_token", data.data.session.access_token);
    localStorage.setItem("refresh_token", data.data.session.refresh_token);
  }

  return data;
}
```

#### Logout

```javascript
async function logout() {
  const token = localStorage.getItem("access_token");

  await fetch("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Clear tokens
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}
```

---

### React Example with Context

```javascript
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("access_token"));

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
      } else {
        setToken(null);
        localStorage.removeItem("access_token");
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      const { access_token, refresh_token } = data.data.session;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setToken(access_token);
      setUser(data.data.user);
    }

    return data;
  };

  const signup = async (email, password, metadata) => {
    const response = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, metadata }),
    });

    const data = await response.json();

    if (data.success && data.data.session) {
      const { access_token, refresh_token } = data.data.session;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setToken(access_token);
      setUser(data.data.user);
    }

    return data;
  };

  const logout = async () => {
    await fetch("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

---

## ✅ Best Practices

### 1. Token Storage

**✅ DO:**

- Store tokens in `localStorage` or `sessionStorage` for web apps
- Use secure storage mechanisms in mobile apps
- Clear tokens on logout

**❌ DON'T:**

- Store tokens in cookies without proper security (CSRF risk)
- Expose tokens in URLs or logs
- Share tokens between users

### 2. Token Refresh

- Implement automatic token refresh before expiration
- Handle 401 errors by attempting to refresh token
- Redirect to login if refresh fails

```javascript
async function makeAuthenticatedRequest(url, options = {}) {
  let token = localStorage.getItem("access_token");

  // Add token to request
  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  let response = await fetch(url, options);

  // If token expired, try to refresh
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();

    if (refreshed.success) {
      // Retry with new token
      token = localStorage.getItem("access_token");
      options.headers["Authorization"] = `Bearer ${token}`;
      response = await fetch(url, options);
    } else {
      // Redirect to login
      window.location.href = "/login";
      return null;
    }
  }

  return response.json();
}
```

### 3. Password Requirements

Enforce strong passwords:

- Minimum 6 characters (adjust in code as needed)
- Consider adding: uppercase, lowercase, numbers, special characters
- Implement password strength meter on frontend

### 4. Error Handling

Always handle authentication errors gracefully:

```javascript
try {
  const data = await login(email, password);

  if (!data.success) {
    // Show error message to user
    showError(data.error);
  }
} catch (error) {
  // Handle network or other errors
  showError("Network error. Please try again.");
}
```

### 5. Security Headers

When making requests, include:

```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
}
```

### 6. Email Confirmation

If email confirmation is enabled:

- Show appropriate message after signup
- Prevent access to sensitive features until confirmed
- Use `requireEmailConfirmed` middleware on protected routes

---

## 🔧 Troubleshooting

### "Invalid or expired token"

- Token might have expired (default: 1 hour)
- Try refreshing the token
- User might need to login again

### "Email confirmation required"

- User hasn't confirmed their email
- Check Supabase email settings
- Resend confirmation email if needed

### CORS Errors

- Ensure `FRONTEND_URL` is set correctly in `.env`
- Check CORS configuration in `server.js`
- Verify the frontend is using the correct API URL

### "Authentication required"

- Token not provided in request
- Token format incorrect (should be: `Bearer <token>`)
- Check if user is logged in

---

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT Best Practices](https://jwt.io/introduction)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## 🎯 Next Steps

1. **Enable Email Confirmation** (Optional)

   - Configure in Supabase dashboard
   - Customize email templates

2. **Add Social Login** (Optional)

   - Enable providers in Supabase (Google, GitHub, etc.)
   - Add social login endpoints

3. **Implement Role-Based Access**

   - Add user roles in your database
   - Use `requireRole` middleware

4. **Add Rate Limiting**

   - Protect against brute force attacks
   - Use packages like `express-rate-limit`

5. **Audit Logging**
   - Log authentication events
   - Track failed login attempts

---

Need help? Check the [Supabase documentation](https://supabase.com/docs) or open an issue!
