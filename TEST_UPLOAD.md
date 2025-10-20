# Testing Upload & Analyze with Authentication

Quick guide to test your upload and AI analysis functionality after implementing user-specific data isolation.

## 📋 Prerequisites

- ✅ Database migration completed
- ✅ Server running (`npm start` or `npm run dev`)
- ✅ At least one test user created
- ✅ Test image file ready

---

## 🚀 Quick Test (Browser Console)

Open your browser console (F12) and paste this:

```javascript
async function testUploadAndAnalyze() {
  const API_URL = "http://localhost:3000";

  console.log("🔐 Step 1: Logging in...");

  // Step 1: Login
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test@example.com",
      password: "password123",
    }),
  });

  const loginData = await loginRes.json();

  if (!loginData.success) {
    console.error("❌ Login failed:", loginData.error);
    return;
  }

  const token = loginData.data.session.access_token;
  console.log("✅ Login successful!");
  console.log("📝 Token:", token.substring(0, 30) + "...");

  // Step 2: Upload image (you'll need to select a file)
  console.log("\n📤 Step 2: Upload an image...");
  console.log("Please run: testUpload(token)");
  console.log("Then select an image file when prompted");

  // Store token globally for next step
  window.testToken = token;
}

async function testUpload(token) {
  const API_URL = "http://localhost:3000";

  // Create file input
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log(
      `📁 Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`
    );

    const formData = new FormData();
    formData.append("image", file);

    console.log("⏳ Uploading...");

    const uploadRes = await fetch(`${API_URL}/api/upload/upload-and-analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json();

    if (uploadData.success) {
      console.log("✅ Upload & Analysis successful!");
      console.log("📊 Result:", uploadData.data);
      console.log("\n📝 File ID:", uploadData.data.id);
      console.log("🖼️ Image URL:", uploadData.data.publicUrl);
      console.log("💬 Description:", uploadData.data.description);
      console.log("🏷️ Tags:", uploadData.data.tags);
      console.log("📈 Status:", uploadData.data.status);
    } else {
      console.error("❌ Upload failed:", uploadData.error);
    }
  };

  input.click();
}

// Run the test
testUploadAndAnalyze();
```

After running `testUploadAndAnalyze()`, run:

```javascript
testUpload(window.testToken);
```

Then select an image file when prompted.

---

## 🧪 Testing with cURL

### Step 1: Sign Up (if needed)

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Step 2: Login

```bash
# Save token to variable
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.data.session.access_token')

echo "Token: $TOKEN"
```

### Step 3: Test Simple Upload

```bash
curl -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@path/to/your/image.jpg"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "filename": "test.jpg",
    "size": 123456,
    "type": "image/jpeg",
    "path": "images/user-uuid/timestamp-random.jpg",
    "publicUrl": "https://...supabase.co/.../image.jpg",
    "uploadedAt": "2024-01-01T12:00:00.000Z",
    "id": "uuid-here"
  }
}
```

### Step 4: Test Upload + AI Analysis

```bash
curl -X POST http://localhost:3000/api/upload/upload-and-analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@path/to/your/image.jpg"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Image uploaded and analyzed successfully",
  "data": {
    "id": "uuid",
    "filename": "test.jpg",
    "publicUrl": "https://...supabase.co/.../image.jpg",
    "description": "A beautiful sunset over the ocean with vibrant orange and pink colors",
    "tags": ["sunset", "ocean", "nature", "scenic", "vibrant"],
    "status": "completed",
    "uploadedAt": "2024-01-01T12:00:00.000Z",
    "analyzedAt": "2024-01-01T12:00:05.000Z",
    "analysis": {
      "success": true,
      "error": null,
      "timestamp": "2024-01-01T12:00:05.000Z"
    }
  }
}
```

### Step 5: Get Your Files

```bash
curl -X GET http://localhost:3000/api/files \
  -H "Authorization: Bearer $TOKEN"
```

### Step 6: Analyze Existing Image

```bash
# Replace IMAGE_ID with actual ID from upload response
IMAGE_ID="your-image-id-here"

curl -X POST http://localhost:3000/api/upload/analyze/$IMAGE_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🧪 Testing with Postman/Thunder Client

### 1. **Setup Environment Variables**

Create these variables:

- `base_url`: `http://localhost:3000`
- `token`: (will be set after login)

### 2. **Login Request**

- **Method:** POST
- **URL:** `{{base_url}}/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```
- **Tests (to save token):**
  ```javascript
  const response = pm.response.json();
  if (response.success) {
    pm.environment.set("token", response.data.session.access_token);
  }
  ```

### 3. **Upload Image**

- **Method:** POST
- **URL:** `{{base_url}}/api/upload/image`
- **Headers:** `Authorization: Bearer {{token}}`
- **Body:** `form-data`
  - Key: `image` (type: File)
  - Value: Select your image file

### 4. **Upload + Analyze**

- **Method:** POST
- **URL:** `{{base_url}}/api/upload/upload-and-analyze`
- **Headers:** `Authorization: Bearer {{token}}`
- **Body:** `form-data`
  - Key: `image` (type: File)
  - Value: Select your image file

### 5. **Bulk Upload (3 images max)**

- **Method:** POST
- **URL:** `{{base_url}}/api/upload/bulk-upload-and-analyze`
- **Headers:** `Authorization: Bearer {{token}}`
- **Body:** `form-data`
  - Key: `images` (type: File, multiple)
  - Value: Select up to 3 image files

---

## ✅ What to Check

### Upload Success Indicators

- ✅ Status code: 201 or 200
- ✅ `success: true` in response
- ✅ File has unique ID
- ✅ `publicUrl` is accessible
- ✅ File stored in user-specific path: `images/{user_id}/...`
- ✅ Database record created with `user_id`

### AI Analysis Success Indicators

- ✅ Status: `"completed"`
- ✅ `description` field has meaningful text
- ✅ `tags` array has 5 items
- ✅ Analysis timestamp is present
- ✅ `analysis.success: true`

### Authentication Working

- ✅ Upload without token returns 401
- ✅ Different users see different files
- ✅ Users can't access other users' files

---

## 🐛 Troubleshooting

### Error: "No authentication token provided"

**Problem:** Token not included in request

**Solution:**

```bash
# Make sure to include Authorization header
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Error: "Invalid or expired token"

**Problem:** Token expired or malformed

**Solution:**

```bash
# Login again to get fresh token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.session.access_token')
```

### Error: "Failed to upload image to storage"

**Possible causes:**

1. Supabase credentials not configured
2. Storage bucket not created
3. Network issues

**Solution:**

```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Create 'uploads' bucket in Supabase Dashboard if missing
# Go to: Storage → Create bucket → Name: "uploads" → Public
```

### Error: "AI analysis failed"

**Possible causes:**

1. OpenAI API key not set
2. Image URL not accessible
3. Unsupported image format

**Solution:**

```bash
# Check OpenAI key
echo $OPENAI_API_KEY

# Test with common formats: JPG, PNG, GIF, WebP
# Image must be publicly accessible
```

### Error: "Image not found or access denied"

**Problem:** Trying to access another user's file

**Solution:**

```bash
# Make sure you're using your own file ID
# Get your files first:
curl -X GET http://localhost:3000/api/files \
  -H "Authorization: Bearer $TOKEN"
```

### Database Error: "user_id violates foreign key constraint"

**Problem:** User doesn't exist in auth.users table

**Solution:**

```bash
# Make sure user is signed up first
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 📊 Complete Test Script

Save as `test-upload-analyze.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:3000"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="password123"
TEST_IMAGE="test-image.jpg"  # Change to your image path

echo "🧪 Testing Upload & Analyze with Authentication"
echo "=============================================="

# Step 1: Login
echo ""
echo "🔐 Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.session.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Login successful!"
echo "📝 Token: ${TOKEN:0:30}..."

# Step 2: Test simple upload
echo ""
echo "📤 Step 2: Testing simple upload..."
UPLOAD_RESPONSE=$(curl -s -X POST $API_URL/api/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$TEST_IMAGE")

echo "$UPLOAD_RESPONSE" | jq '.'

UPLOAD_SUCCESS=$(echo $UPLOAD_RESPONSE | jq -r '.success')
if [ "$UPLOAD_SUCCESS" == "true" ]; then
  echo "✅ Upload successful!"
else
  echo "❌ Upload failed!"
fi

# Step 3: Test upload + analyze
echo ""
echo "🤖 Step 3: Testing upload + AI analysis..."
ANALYZE_RESPONSE=$(curl -s -X POST $API_URL/api/upload/upload-and-analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$TEST_IMAGE")

echo "$ANALYZE_RESPONSE" | jq '.'

ANALYZE_SUCCESS=$(echo $ANALYZE_RESPONSE | jq -r '.success')
DESCRIPTION=$(echo $ANALYZE_RESPONSE | jq -r '.data.description')
TAGS=$(echo $ANALYZE_RESPONSE | jq -r '.data.tags | length')

if [ "$ANALYZE_SUCCESS" == "true" ]; then
  echo "✅ Upload & Analysis successful!"
  echo "💬 Description: $DESCRIPTION"
  echo "🏷️  Number of tags: $TAGS"
else
  echo "❌ Upload & Analysis failed!"
fi

# Step 4: Get user files
echo ""
echo "📂 Step 4: Getting user files..."
FILES_RESPONSE=$(curl -s -X GET $API_URL/api/files \
  -H "Authorization: Bearer $TOKEN")

FILE_COUNT=$(echo $FILES_RESPONSE | jq -r '.data | length')
echo "✅ Found $FILE_COUNT files"

# Step 5: Test without authentication (should fail)
echo ""
echo "🔒 Step 5: Testing upload without auth (should fail)..."
NO_AUTH_RESPONSE=$(curl -s -X POST $API_URL/api/upload/image \
  -F "image=@$TEST_IMAGE")

NO_AUTH_SUCCESS=$(echo $NO_AUTH_RESPONSE | jq -r '.success')
if [ "$NO_AUTH_SUCCESS" == "false" ]; then
  echo "✅ Correctly rejected unauthorized request!"
else
  echo "❌ Security issue: Upload succeeded without auth!"
fi

echo ""
echo "🎉 Testing complete!"
```

Run it:

```bash
chmod +x test-upload-analyze.sh
./test-upload-analyze.sh
```

---

## 📋 Test Checklist

- [ ] User can login successfully
- [ ] Upload with authentication works
- [ ] Upload returns file ID and URL
- [ ] Files stored in user-specific folder
- [ ] AI analysis generates description
- [ ] AI analysis generates 5 tags
- [ ] Upload without auth returns 401
- [ ] User can see their own files
- [ ] User cannot see other users' files
- [ ] Database records have user_id
- [ ] File URLs are accessible

---

## 🎯 Expected Results

### ✅ Successful Upload + Analyze

```json
{
  "success": true,
  "message": "Image uploaded and analyzed successfully",
  "data": {
    "id": "abc-123-def",
    "filename": "test.jpg",
    "publicUrl": "https://...supabase.co/.../image.jpg",
    "description": "AI-generated description here",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "status": "completed",
    "analysis": {
      "success": true
    }
  }
}
```

### ❌ Upload Without Auth

```json
{
  "success": false,
  "error": "No authentication token provided",
  "message": "Please provide a valid Bearer token in the Authorization header"
}
```

---

Need help? Check [AUTH_SETUP.md](./AUTH_SETUP.md) and [USER_SPECIFIC_DATA.md](./USER_SPECIFIC_DATA.md)!
