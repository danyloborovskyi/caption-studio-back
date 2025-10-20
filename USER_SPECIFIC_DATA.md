# User-Specific Data Isolation Guide

This guide explains how to store images and data separately for each user, ensuring users can only access their own files.

## 📋 Table of Contents

- [Overview](#overview)
- [Database Setup](#database-setup)
- [Implementation Steps](#implementation-steps)
- [Code Changes](#code-changes)
- [Testing](#testing)

---

## 🎯 Overview

To implement user-specific data isolation, you need to:

1. ✅ Add `user_id` column to `uploaded_files` table
2. ✅ Store user ID when uploading files
3. ✅ Filter queries by authenticated user
4. ✅ Protect routes with authentication middleware
5. ✅ Enable Row Level Security (RLS) in Supabase

---

## 🗄️ Database Setup

### Step 1: Update Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- Add user_id column to uploaded_files table
ALTER TABLE uploaded_files
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id
ON uploaded_files(user_id);

-- Add index for user_id + uploaded_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_uploaded
ON uploaded_files(user_id, uploaded_at DESC);
```

### Step 2: Enable Row Level Security (RLS)

This ensures database-level security so users can only access their own data:

```sql
-- Enable RLS on uploaded_files table
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own files
CREATE POLICY "Users can view own files"
ON uploaded_files
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own files
CREATE POLICY "Users can insert own files"
ON uploaded_files
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own files
CREATE POLICY "Users can update own files"
ON uploaded_files
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can only delete their own files
CREATE POLICY "Users can delete own files"
ON uploaded_files
FOR DELETE
USING (auth.uid() = user_id);
```

### Step 3: Service Role Bypass (Optional)

If you need admin access to all files (for service/admin operations):

```sql
-- Policy: Service role can access all files
CREATE POLICY "Service role can access all files"
ON uploaded_files
FOR ALL
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);
```

---

## 🔧 Implementation Steps

### Step 1: Protect Upload Routes

Update `routes/upload.js` to require authentication and store user ID:

```javascript
const { authenticateUser } = require("../middleware/auth");

// Add authentication middleware to ALL upload routes
router.use(authenticateUser);

// In your upload handler, add user_id to database insert:
const { data: fileRecord, error: dbError } = await supabase
  .from("uploaded_files")
  .insert([
    {
      filename: fileName,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.mimetype,
      public_url: publicUrl,
      user_id: req.user.id, // ← Add this line
      status: "uploaded",
      description: null,
      tags: [],
    },
  ])
  .select()
  .single();
```

### Step 2: Protect File Routes

Update `routes/files.js` to filter by authenticated user:

```javascript
const { authenticateUser } = require("../middleware/auth");

// Add authentication middleware
router.use(authenticateUser);

// Filter by user_id in all queries:
let query = supabase
  .from("uploaded_files")
  .select("*", { count: "exact" })
  .eq("user_id", req.user.id); // ← Add this filter
```

### Step 3: Update Supabase Client

For user-specific operations, use the anon key (respects RLS):

```javascript
// For user operations (respects RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// For admin operations (bypasses RLS) - use sparingly
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

---

## 💻 Code Changes

### 1. Update `routes/upload.js`

Add authentication and user_id tracking:

```javascript
const express = require("express");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// Protect ALL routes in this file
router.use(authenticateUser);

// In upload handler:
router.post("/image", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user.id; // Get authenticated user ID

    // ... your upload logic ...

    // Insert with user_id
    const { data: fileRecord, error: dbError } = await supabase
      .from("uploaded_files")
      .insert([
        {
          filename: fileName,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.mimetype,
          public_url: publicUrl,
          user_id: userId, // ← Store user ID
          status: "uploaded",
        },
      ])
      .select()
      .single();

    // ... rest of code ...
  } catch (error) {
    // ... error handling ...
  }
});

module.exports = router;
```

### 2. Update `routes/files.js`

Filter all queries by user:

```javascript
const express = require("express");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// Protect ALL routes
router.use(authenticateUser);

// GET all files - filtered by user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    let query = supabase
      .from("uploaded_files")
      .select("*", { count: "exact" })
      .eq("user_id", userId); // ← Filter by user

    // ... rest of query logic ...
  } catch (error) {
    // ... error handling ...
  }
});

// GET single file - automatically filtered by RLS
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: file, error } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId) // ← Ensure user owns this file
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    res.json({ success: true, data: file });
  } catch (error) {
    // ... error handling ...
  }
});

// DELETE file - ensure user owns it
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const { data: file } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!file) {
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    // Delete file...
  } catch (error) {
    // ... error handling ...
  }
});

module.exports = router;
```

### 3. Update Statistics Route

Show user-specific stats:

```javascript
router.get("/stats", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total files for this user
    const { count: totalFiles } = await supabase
      .from("uploaded_files")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId); // ← Filter by user

    // Get storage usage for this user
    const { data: sizeData } = await supabase
      .from("uploaded_files")
      .select("file_size")
      .eq("user_id", userId); // ← Filter by user

    const totalBytes = (sizeData || []).reduce((sum, file) => {
      return sum + (file.file_size || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        total_files: totalFiles || 0,
        storage_usage: {
          total_bytes: totalBytes,
          total_mb: (totalBytes / (1024 * 1024)).toFixed(2),
        },
      },
    });
  } catch (error) {
    // ... error handling ...
  }
});
```

---

## 🧪 Testing User-Specific Data

### Test Script

Create `test-user-isolation.js`:

```javascript
async function testUserIsolation() {
  const BASE_URL = "http://localhost:3000";

  console.log("🔐 Testing User Data Isolation...\n");

  // User 1: Login
  console.log("👤 User 1: Logging in...");
  const user1Login = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user1@example.com",
      password: "password123",
    }),
  }).then((r) => r.json());

  const token1 = user1Login.data.session.access_token;
  console.log("✅ User 1 logged in");

  // User 1: Upload image
  console.log("\n📤 User 1: Uploading image...");
  const formData1 = new FormData();
  formData1.append("image", imageFile); // Your image file

  const upload1 = await fetch(`${BASE_URL}/api/upload/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token1}` },
    body: formData1,
  }).then((r) => r.json());

  console.log("✅ User 1 uploaded:", upload1.data.file.id);

  // User 2: Login
  console.log("\n👤 User 2: Logging in...");
  const user2Login = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user2@example.com",
      password: "password123",
    }),
  }).then((r) => r.json());

  const token2 = user2Login.data.session.access_token;
  console.log("✅ User 2 logged in");

  // User 2: Try to access User 1's file (should fail)
  console.log("\n🔒 User 2: Trying to access User 1's file...");
  const accessAttempt = await fetch(
    `${BASE_URL}/api/files/${upload1.data.file.id}`,
    {
      headers: { Authorization: `Bearer ${token2}` },
    }
  );

  if (accessAttempt.status === 404) {
    console.log("✅ ACCESS DENIED - User isolation working!");
  } else {
    console.log("❌ SECURITY ISSUE - User 2 can access User 1's file!");
  }

  // User 2: Get their own files (should be empty or different)
  console.log("\n📂 User 2: Getting own files...");
  const user2Files = await fetch(`${BASE_URL}/api/files`, {
    headers: { Authorization: `Bearer ${token2}` },
  }).then((r) => r.json());

  console.log(`User 2 has ${user2Files.data.length} files`);

  // User 1: Get their own files (should include uploaded file)
  console.log("\n📂 User 1: Getting own files...");
  const user1Files = await fetch(`${BASE_URL}/api/files`, {
    headers: { Authorization: `Bearer ${token1}` },
  }).then((r) => r.json());

  console.log(`User 1 has ${user1Files.data.length} files`);

  console.log("\n🎉 User isolation test complete!");
}

testUserIsolation();
```

### Manual Testing Steps

1. **Create Two Users:**

```bash
# User 1
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}'

# User 2
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@test.com","password":"password123"}'
```

2. **Login as User 1 and Upload:**

```bash
# Login
TOKEN1=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}' \
  | jq -r '.data.session.access_token')

# Upload image
curl -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer $TOKEN1" \
  -F "image=@test-image.jpg"
```

3. **Login as User 2 and Try to Access:**

```bash
# Login
TOKEN2=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@test.com","password":"password123"}' \
  | jq -r '.data.session.access_token')

# Try to get User 1's files (should be empty)
curl -X GET http://localhost:3000/api/files \
  -H "Authorization: Bearer $TOKEN2"
```

4. **Verify Isolation:**

- User 1 should see their uploaded images
- User 2 should NOT see User 1's images
- Attempting to access another user's file ID should return 404

---

## ✅ Verification Checklist

- [ ] `user_id` column added to `uploaded_files` table
- [ ] RLS policies enabled and tested
- [ ] Authentication middleware added to all protected routes
- [ ] Upload routes store `user_id`
- [ ] File retrieval filters by `user_id`
- [ ] Users cannot access other users' files
- [ ] File deletion checks ownership
- [ ] Statistics are user-specific
- [ ] Storage quotas tracked per user (if implemented)

---

## 🔒 Security Best Practices

### 1. Always Use Authentication

```javascript
// ✅ GOOD: Protected route
router.get("/", authenticateUser, (req, res) => {
  const userId = req.user.id;
  // ... filter by userId
});

// ❌ BAD: Unprotected route
router.get("/", (req, res) => {
  // Anyone can access
});
```

### 2. Never Trust Client Input

```javascript
// ❌ BAD: Trusting user_id from request body
const userId = req.body.user_id; // User can fake this!

// ✅ GOOD: Get user_id from authenticated token
const userId = req.user.id; // From JWT token
```

### 3. Double-Check Ownership

```javascript
// ✅ GOOD: Verify ownership before operations
const { data: file } = await supabase
  .from("uploaded_files")
  .select("*")
  .eq("id", fileId)
  .eq("user_id", req.user.id) // ← Verify ownership
  .single();

if (!file) {
  return res.status(404).json({ error: "File not found" });
}

// Now safe to perform operations
```

### 4. Use RLS as Defense-in-Depth

Even if your application code has a bug, RLS provides database-level protection:

```sql
-- Database will automatically enforce this
CREATE POLICY "Users can only view own files"
ON uploaded_files
FOR SELECT
USING (auth.uid() = user_id);
```

---

## 📊 Migration Script for Existing Data

If you have existing files without `user_id`, you need to handle them:

### Option 1: Assign to a Default User

```sql
-- Create a default/admin user first in Supabase Auth
-- Then update existing records:
UPDATE uploaded_files
SET user_id = 'YOUR_DEFAULT_USER_UUID'
WHERE user_id IS NULL;
```

### Option 2: Delete Orphaned Records

```sql
-- ⚠️ Warning: This deletes data!
DELETE FROM uploaded_files
WHERE user_id IS NULL;
```

### Option 3: Keep Public Files

```sql
-- Add a special policy for public/legacy files
CREATE POLICY "Public files are viewable by all"
ON uploaded_files
FOR SELECT
USING (user_id IS NULL OR auth.uid() = user_id);
```

---

## 🎯 Next Steps

1. **Implement Storage Quotas**

   - Track storage usage per user
   - Enforce upload limits
   - Show usage in user dashboard

2. **Add Sharing Features** (Optional)

   - Allow users to share specific files
   - Create public/private file flags
   - Generate shareable links

3. **Implement File Categories**

   - Add folders/albums per user
   - Tag-based organization
   - Smart collections

4. **Add Audit Logging**
   - Track file access
   - Log upload/delete events
   - Monitor suspicious activity

---

## 📚 Additional Resources

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

Need help? Check the [AUTH_SETUP.md](./AUTH_SETUP.md) for authentication details!
