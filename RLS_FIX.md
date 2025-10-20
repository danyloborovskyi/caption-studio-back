# RLS Policy Error Fix

## 🐛 The Problem

When trying to upload, you received this error:

```json
{
  "success": false,
  "error": "Failed to upload image to storage",
  "details": "new row violates row-level security policy"
}
```

## 🔍 Root Cause

The issue was that we changed the Supabase client to use `SUPABASE_ANON_KEY` to respect Row Level Security (RLS), but **we weren't passing the user's JWT token to Supabase**.

The RLS policies check if `auth.uid()` equals the `user_id`, but Supabase didn't know who the authenticated user was because we weren't including their token in the Supabase client.

## ✅ The Solution

We created a **helper function** that creates a user-specific Supabase client with the user's JWT token:

```javascript
// Helper function to create user-specific Supabase client
function getSupabaseClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
```

Then in each route, we:

1. **Get the user's token** from `req.token` (set by auth middleware)
2. **Create a user-specific Supabase client** using the token
3. **Use that client** for all Supabase operations

### Before (Broken):

```javascript
router.post("/upload-and-analyze", upload.single("image"), async (req, res) => {
  const userId = req.user.id;

  // ❌ Using global Supabase client without user context
  const { data, error } = await supabase
    .from("uploaded_files")
    .insert([{ user_id: userId, ... }]);

  // RLS blocks this because supabase doesn't know who the user is
});
```

### After (Fixed):

```javascript
router.post("/upload-and-analyze", upload.single("image"), async (req, res) => {
  const userId = req.user.id;
  const userToken = req.token;

  // ✅ Create user-specific client with their token
  const supabase = getSupabaseClient(userToken);

  // Now RLS knows who the user is and allows the insert
  const { data, error } = await supabase
    .from("uploaded_files")
    .insert([{ user_id: userId, ... }]);
});
```

## 🔧 What Changed

### Updated Routes

All upload routes now:

1. Get `userToken` from `req.token`
2. Create Supabase client: `const supabase = getSupabaseClient(userToken)`
3. Use that client for all operations

**Routes updated:**

- ✅ `POST /image` - Upload single image
- ✅ `POST /analyze/:id` - Analyze existing image
- ✅ `POST /upload-and-analyze` - Upload + AI analysis
- ✅ `POST /bulk-upload-and-analyze` - Bulk upload
- ✅ `POST /bulk-analyze` - Bulk analyze

## 🧪 Testing Now

Try your upload again:

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.session.access_token')

# Upload + Analyze (should work now!)
curl -X POST http://localhost:3000/api/upload/upload-and-analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test.jpg"
```

**Expected:** Upload should succeed with `"success": true` and AI analysis results!

## 📊 How RLS Works Now

```
User Request
    ↓
Authentication Middleware
    ↓ (extracts user from JWT)
req.user = { id, email }
req.token = "jwt-token"
    ↓
Upload Route Handler
    ↓
getSupabaseClient(req.token)
    ↓ (creates Supabase client with user's JWT)
Supabase Client with Auth Context
    ↓
Database Insert/Query
    ↓
RLS Policy Check
    ↓ (auth.uid() from JWT matches user_id)
✅ Operation Allowed!
```

## ✅ Benefits

1. **RLS Protection** - Database-level security enforced
2. **User Isolation** - Users can only access their own data
3. **No Admin Bypass** - Even backend code respects RLS
4. **Audit Trail** - All operations tracked to specific users

## 🔐 Security Notes

- Each request creates a NEW Supabase client with the user's specific token
- The token is validated by Supabase on every operation
- If token is invalid/expired, RLS will block the operation
- Users cannot forge or manipulate user_id - it comes from the JWT

---

**Status:** ✅ **FIXED!**

Your uploads should now work with proper user isolation and RLS protection.
