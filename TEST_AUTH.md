# Testing Authentication Endpoints

Quick guide to test your authentication system, including logout functionality.

## 🧪 Testing Logout Functionality

### Method 1: Using cURL (Command Line)

#### Step 1: Login First

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {...},
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "...",
      "expires_at": 1234567890,
      "expires_in": 3600
    }
  }
}
```

**Copy the `access_token` from the response!**

#### Step 2: Verify Token Works (Before Logout)

```bash
curl -X GET http://localhost:3000/api/auth/user \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response:** Should return user profile ✅

#### Step 3: Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### Step 4: Verify Token No Longer Works (After Logout)

```bash
curl -X GET http://localhost:3000/api/auth/user \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response:** Should return 401 error ❌

```json
{
  "success": false,
  "error": "Invalid or expired token",
  "message": "Please login again"
}
```

---

### Method 2: Using Postman or Thunder Client

#### 1. **Login**

- Method: `POST`
- URL: `http://localhost:3000/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (JSON):
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```
- **Save the `access_token` from response!**

#### 2. **Test Token Works**

- Method: `GET`
- URL: `http://localhost:3000/api/auth/user`
- Headers:
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Expected: 200 OK with user data ✅

#### 3. **Logout**

- Method: `POST`
- URL: `http://localhost:3000/api/auth/logout`
- Headers:
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Expected: 200 OK with success message ✅

#### 4. **Verify Token is Invalid**

- Method: `GET`
- URL: `http://localhost:3000/api/auth/user`
- Headers:
  - `Authorization: Bearer YOUR_TOKEN_HERE` (same token)
- Expected: 401 Unauthorized ❌

---

### Method 3: Browser Console (Frontend Testing)

Open your browser console (F12) and run:

```javascript
// Step 1: Login
async function testLogout() {
  // Login first
  const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test@example.com",
      password: "password123",
    }),
  });

  const loginData = await loginResponse.json();
  console.log("✅ Login successful:", loginData);

  const token = loginData.data.session.access_token;
  console.log("📝 Token:", token);

  // Step 2: Verify token works
  const userResponse = await fetch("http://localhost:3000/api/auth/user", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const userData = await userResponse.json();
  console.log("✅ Token works - User data:", userData);

  // Step 3: Logout
  const logoutResponse = await fetch("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const logoutData = await logoutResponse.json();
  console.log("🚪 Logout response:", logoutData);

  // Step 4: Try using token again (should fail)
  const testResponse = await fetch("http://localhost:3000/api/auth/user", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const testData = await testResponse.json();

  if (testResponse.status === 401) {
    console.log("✅ LOGOUT WORKS! Token is now invalid:", testData);
  } else {
    console.log("❌ LOGOUT FAILED! Token still works");
  }
}

// Run the test
testLogout();
```

---

### Method 4: Node.js Test Script

Create a file `test-logout.js`:

```javascript
const fetch = require("node-fetch"); // or use native fetch in Node 18+

async function testLogout() {
  const BASE_URL = "http://localhost:3000/api/auth";

  try {
    // Step 1: Login
    console.log("🔐 Step 1: Logging in...");
    const loginRes = await fetch(`${BASE_URL}/login`, {
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

    console.log("✅ Login successful");
    const token = loginData.data.session.access_token;
    console.log(`📝 Token: ${token.substring(0, 20)}...`);

    // Step 2: Verify token works
    console.log("\n🔍 Step 2: Verifying token works...");
    const userRes = await fetch(`${BASE_URL}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userData = await userRes.json();

    if (userData.success) {
      console.log("✅ Token is valid - User:", userData.data.user.email);
    } else {
      console.log("❌ Token verification failed");
      return;
    }

    // Step 3: Logout
    console.log("\n🚪 Step 3: Logging out...");
    const logoutRes = await fetch(`${BASE_URL}/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const logoutData = await logoutRes.json();

    if (logoutData.success) {
      console.log("✅ Logout successful");
    } else {
      console.log("❌ Logout failed:", logoutData.error);
      return;
    }

    // Step 4: Verify token no longer works
    console.log("\n🔬 Step 4: Verifying token is now invalid...");
    const testRes = await fetch(`${BASE_URL}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const testData = await testRes.json();

    if (testRes.status === 401 && !testData.success) {
      console.log("✅ LOGOUT WORKS! Token is now invalid");
      console.log(`   Error: ${testData.error}`);
    } else {
      console.log("❌ LOGOUT FAILED! Token still works");
      console.log("   User data:", testData);
    }

    console.log("\n🎉 Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testLogout();
```

Run it:

```bash
node test-logout.js
```

---

## ✅ What Should Happen When Logout Works

### Before Logout:

- ✅ Token returns user data
- ✅ Protected routes are accessible
- ✅ Token is valid in Supabase

### After Logout:

- ❌ Token returns 401 Unauthorized
- ❌ Protected routes reject the request
- ❌ Token is revoked in Supabase
- ❌ Error message: "Invalid or expired token"

---

## 🐛 Troubleshooting

### Problem: Logout returns 401 "No authentication token"

**Solution:** Make sure you're sending the Authorization header:

```bash
Authorization: Bearer YOUR_TOKEN_HERE
```

### Problem: Token still works after logout

**Possible causes:**

1. Supabase Admin API not configured properly
2. Using wrong Supabase key (need service key for admin operations)
3. Token wasn't actually revoked

**Check:**

```javascript
// In routes/auth.js, the logout route uses:
await supabase.auth.admin.signOut(token);
```

Make sure `SUPABASE_SERVICE_KEY` is set in your `.env` file!

### Problem: "signOut is not a function"

This means you might be using the anon key instead of service key for admin operations. Check your logout route uses the proper Supabase client.

---

## 📊 Complete Test Checklist

- [ ] User can login successfully
- [ ] Token is received in login response
- [ ] Token works to access protected routes
- [ ] Logout endpoint accepts token
- [ ] Logout returns success message
- [ ] Token becomes invalid after logout
- [ ] User cannot access protected routes after logout
- [ ] Error message is appropriate (401 Unauthorized)

---

## 🔄 Quick One-Liner Test

If you just want a quick test:

```bash
# Replace with your actual credentials and save token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//') && \
echo "Token: $TOKEN" && \
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" && \
echo "\nTesting if token still works..." && \
curl -X GET http://localhost:3000/api/auth/user \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Last curl should return 401 error ✅

---

## 🔑 Testing Forgot Password & Reset Password

### Testing Forgot Password Endpoint

The forgot-password endpoint sends a password reset email to the user.

#### Method 1: cURL

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Password reset email sent. Please check your inbox."
}
```

#### Method 2: Browser Console

```javascript
async function testForgotPassword() {
  const response = await fetch(
    "http://localhost:3000/api/auth/forgot-password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    }
  );

  const data = await response.json();
  console.log("Forgot password response:", data);
}

testForgotPassword();
```

#### Method 3: Postman/Thunder Client

- **Method:** `POST`
- **URL:** `http://localhost:3000/api/auth/forgot-password`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "email": "test@example.com"
  }
  ```

---

### What Happens Next?

1. **✅ Endpoint Returns Success** - You'll get a success message
2. **📧 Email is Sent** - User receives a password reset email
3. **🔗 Email Contains Reset Link** - Link format: `YOUR_FRONTEND_URL/reset-password?access_token=xxx`

---

### How to Check If Email Was Sent

#### Option 1: Check Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Authentication** → **Users**
3. Find your user
4. Recent password reset requests will be logged

#### Option 2: Check Email Inbox

- **If using real email:** Check the inbox for `test@example.com`
- **If using Supabase local/dev:** Emails appear in Supabase logs

#### Option 3: Check Supabase Inbucket (Local Development)

If running Supabase locally:

1. Open `http://localhost:54324`
2. Check the Inbucket interface for emails
3. Find the password reset email

---

### Testing the Complete Password Reset Flow

#### Full Test Script (Browser Console):

```javascript
async function testPasswordResetFlow() {
  console.log("🔐 Testing Password Reset Flow...\n");

  // Step 1: Request password reset
  console.log("📧 Step 1: Requesting password reset email...");
  const forgotResponse = await fetch(
    "http://localhost:3000/api/auth/forgot-password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    }
  );

  const forgotData = await forgotResponse.json();
  console.log("Response:", forgotData);

  if (forgotData.success) {
    console.log("✅ Password reset email sent!");
    console.log("📬 Check your email inbox for the reset link");
    console.log("🔗 The link will contain an access_token parameter");
    console.log("\n⚠️  NEXT STEPS:");
    console.log("1. Open the email");
    console.log("2. Click the reset link (or copy the access_token)");
    console.log("3. Use the token with /api/auth/reset-password endpoint");
  } else {
    console.log("❌ Failed:", forgotData.error);
  }
}

testPasswordResetFlow();
```

#### Testing Reset Password (After Getting Token from Email):

```javascript
async function testResetPassword(accessToken, newPassword) {
  const response = await fetch(
    "http://localhost:3000/api/auth/reset-password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken, // From the reset email link
        new_password: newPassword,
      }),
    }
  );

  const data = await response.json();
  console.log("Reset password response:", data);

  if (data.success) {
    console.log("✅ Password reset successful!");
    console.log("🔑 Try logging in with the new password");
  }
}

// Usage: Get the access_token from the reset email, then run:
// testResetPassword('token_from_email_here', 'NewPassword123');
```

---

### Complete Flow Test (cURL):

```bash
# Step 1: Request password reset
echo "📧 Requesting password reset..."
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

echo -e "\n\n📬 Check your email for the reset link!"
echo "The email will contain an access_token"
echo -e "\nStep 2: After getting the token from email, run:"
echo "curl -X POST http://localhost:3000/api/auth/reset-password \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"access_token\":\"TOKEN_FROM_EMAIL\",\"new_password\":\"NewPassword123\"}'"
```

---

### Testing Reset Password with Token:

```bash
# After receiving the email and extracting the access_token:
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "new_password": "NewSecurePassword123"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password."
}
```

---

### Verify Password Was Changed:

```bash
# Try logging in with the NEW password
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "NewSecurePassword123"
  }'
```

Should return login success! ✅

---

### Complete Node.js Test Script:

Create `test-password-reset.js`:

```javascript
async function testPasswordReset() {
  const BASE_URL = "http://localhost:3000/api/auth";
  const TEST_EMAIL = "test@example.com";

  try {
    // Step 1: Request password reset
    console.log("📧 Step 1: Requesting password reset email...");
    const forgotRes = await fetch(`${BASE_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });

    const forgotData = await forgotRes.json();

    if (forgotData.success) {
      console.log("✅ Password reset email sent successfully!");
      console.log(`📬 Check inbox for: ${TEST_EMAIL}`);
      console.log("\n⚠️  MANUAL STEP REQUIRED:");
      console.log("1. Open your email client");
      console.log("2. Find the password reset email");
      console.log("3. Extract the access_token from the reset link");
      console.log("4. Call testResetPassword(token, newPassword)");
      console.log("\nExample:");
      console.log('testResetPassword("token_here", "NewPassword123")');
    } else {
      console.log("❌ Failed to send reset email:", forgotData.error);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

async function testResetPassword(accessToken, newPassword) {
  const BASE_URL = "http://localhost:3000/api/auth";

  try {
    console.log("\n🔑 Step 2: Resetting password...");
    const resetRes = await fetch(`${BASE_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        new_password: newPassword,
      }),
    });

    const resetData = await resetRes.json();

    if (resetData.success) {
      console.log("✅ Password reset successful!");
      console.log("🔐 Testing login with new password...");

      // Try logging in with new password
      const loginRes = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: newPassword,
        }),
      });

      const loginData = await loginRes.json();

      if (loginData.success) {
        console.log("✅ Login with new password successful!");
        console.log("🎉 Password reset flow working correctly!");
      } else {
        console.log("❌ Login failed:", loginData.error);
      }
    } else {
      console.log("❌ Password reset failed:", resetData.error);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = { testPasswordReset, testResetPassword };
}

// Run initial test
testPasswordReset();
```

Run it:

```bash
node test-password-reset.js
```

---

### ⚠️ Important Notes

1. **Email Must Be Configured in Supabase**

   - Go to **Authentication** → **Email Templates**
   - Customize the password reset email template
   - Ensure SMTP settings are configured

2. **Redirect URL**

   - The email link redirects to: `FRONTEND_URL/reset-password`
   - Make sure `FRONTEND_URL` is set in your `.env` file
   - Frontend should extract the `access_token` from URL params

3. **Token Expiration**

   - Reset tokens expire after a certain time (usually 1 hour)
   - Don't wait too long to use the token

4. **Testing Without Email**
   - If you can't receive emails, check Supabase logs
   - Use Supabase local development with Inbucket
   - Or use a service like [Mailtrap](https://mailtrap.io/) for testing

---

### Frontend Integration Example

```javascript
// On your reset-password page
const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState("");

  // Get token from URL
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get("access_token");

  const handleResetPassword = async () => {
    const response = await fetch(
      "http://localhost:3000/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          new_password: newPassword,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      alert("Password reset successful! Please login.");
      window.location.href = "/login";
    } else {
      alert("Error: " + data.error);
    }
  };

  return (
    <div>
      <h2>Reset Password</h2>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Enter new password"
      />
      <button onClick={handleResetPassword}>Reset Password</button>
    </div>
  );
};
```

---

### Troubleshooting Forgot Password

**Problem: No email received**

- Check Supabase email configuration
- Verify SMTP settings
- Check spam folder
- Look in Supabase Auth logs

**Problem: "Email not found"**

- User must be registered first
- Check if email exists in Supabase Auth users

**Problem: Reset link doesn't work**

- Token may have expired
- Request a new reset email
- Check if frontend URL is correct

**Problem: "Invalid or expired reset token"**

- Token expired (default: 1 hour)
- Token already used
- Request a new reset email

---

## 📋 Password Reset Test Checklist

- [ ] Forgot password endpoint returns success
- [ ] Email is sent to user's inbox
- [ ] Email contains reset link with access_token
- [ ] Reset link redirects to correct frontend URL
- [ ] Reset password endpoint accepts token
- [ ] New password is validated (min 6 chars)
- [ ] Password is successfully changed
- [ ] User can login with new password
- [ ] Old password no longer works

---

Need more help? Check the main [AUTH_SETUP.md](./AUTH_SETUP.md) documentation.
