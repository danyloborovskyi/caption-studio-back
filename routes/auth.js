const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const multer = require("multer");
const path = require("path");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// Initialize Supabase clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // Use anon key for auth operations
);

// Service role client for admin operations (like updating user metadata)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service role for admin operations
);

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

// Configure multer for avatar uploads
const avatarStorage = multer.memoryStorage();
const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed."
        )
      );
    }
  },
});

// POST /api/auth/signup - Register a new user
router.post("/signup", async (req, res) => {
  try {
    const { email, password, metadata } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    // Sign up the user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {}, // Optional user metadata
      },
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    // Check if email confirmation is required
    const emailConfirmationRequired = !data.user?.confirmed_at;

    res.status(201).json({
      success: true,
      message: emailConfirmationRequired
        ? "User registered successfully. Please check your email to confirm your account."
        : "User registered successfully",
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
          email_confirmed: !!data.user.confirmed_at,
        },
        session: data.session
          ? {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
            }
          : null,
        email_confirmation_required: emailConfirmationRequired,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to register user",
      details: error.message,
    });
  }
});

// POST /api/auth/login - Login with email and password
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          email_confirmed: !!data.user.confirmed_at,
          user_metadata: data.user.user_metadata,
          created_at: data.user.created_at,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to login",
      details: error.message,
    });
  }
});

// POST /api/auth/logout - Logout (revoke refresh token)
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No authentication token provided",
      });
    }

    // Set the session with the provided token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    // Sign out - this will revoke the refresh token
    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      console.warn("Logout error:", error);
      // Continue anyway, as the token might already be invalid
    }

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to logout",
      details: error.message,
    });
  }
});

// POST /api/auth/refresh - Refresh access token using refresh token
router.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: "Refresh token is required",
      });
    }

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
        },
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh token",
      details: error.message,
    });
  }
});

// GET /api/auth/user - Get current user profile
router.get("/user", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No authentication token provided",
      });
    }

    // Get user from token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          email_confirmed: !!user.confirmed_at,
          phone: user.phone,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_sign_in_at: user.last_sign_in_at,
        },
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get user profile",
      details: error.message,
    });
  }
});

// POST /api/auth/forgot-password - Send password reset email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Password reset email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send password reset email",
      details: error.message,
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post("/reset-password", async (req, res) => {
  try {
    const { access_token, new_password } = req.body;

    if (!access_token || !new_password) {
      return res.status(400).json({
        success: false,
        error: "Access token and new password are required",
      });
    }

    // Validate password strength
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    // Set session with the access token from the reset link
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser(access_token);

    if (sessionError || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    // Create a new client with the user's session for password update
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      }
    );

    // Update password
    const { error } = await userSupabase.auth.updateUser({
      password: new_password,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset password",
      details: error.message,
    });
  }
});

// POST /api/auth/update-password - Update password (requires authentication)
router.post("/update-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    const { current_password, new_password } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No authentication token provided",
      });
    }

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password are required",
      });
    }

    // Validate new password strength
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters long",
      });
    }

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });

    if (signInError) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    // Create a new client with the user's session
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Update password
    const { error } = await userSupabase.auth.updateUser({
      password: new_password,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update password",
      details: error.message,
    });
  }
});

// POST /api/auth/update-profile - Update user profile metadata
router.post("/update-profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    const { metadata } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No authentication token provided",
      });
    }

    if (!metadata || typeof metadata !== "object") {
      return res.status(400).json({
        success: false,
        error: "Metadata object is required",
      });
    }

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    // Create a new client with the user's session
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Update user metadata
    const { data, error } = await userSupabase.auth.updateUser({
      data: metadata,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
          updated_at: data.user.updated_at,
        },
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
      details: error.message,
    });
  }
});

// POST /api/auth/avatar - Upload or update user avatar
router.post(
  "/avatar",
  authenticateUser,
  avatarUpload.single("avatar"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const userToken = req.token;
      const userSupabase = getSupabaseClient(userToken);

      console.log(`📸 User ${req.user.email} uploading avatar`);

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
          message: "Please provide an image file",
        });
      }

      const file = req.file;

      // Generate unique filename
      const fileExt = path.extname(file.originalname);
      const fileName = `${userId}-${Date.now()}${fileExt}`;
      const filePath = `avatars/${userId}/${fileName}`;

      console.log(`📤 Uploading avatar: ${fileName}`);

      // Delete old avatar if exists
      try {
        // Get user metadata using the main supabase client with token
        const { data: userData, error: getUserError } =
          await supabase.auth.getUser(userToken);

        if (!getUserError && userData.user) {
          const oldAvatarUrl = userData.user.user_metadata?.avatar_url;

          if (oldAvatarUrl) {
            // Extract file path from URL
            const urlParts = oldAvatarUrl.split("/avatars/");
            if (urlParts.length > 1) {
              const oldFilePath = `avatars/${urlParts[1]}`;
              await userSupabase.storage.from("avatars").remove([oldFilePath]);
              console.log(`🗑️  Deleted old avatar: ${oldFilePath}`);
            }
          }
        }
      } catch (deleteError) {
        console.log("Note: Could not delete old avatar (may not exist)");
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } =
        await userSupabase.storage
          .from("avatars")
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = userSupabase.storage.from("avatars").getPublicUrl(filePath);

      console.log(`✅ Avatar uploaded: ${publicUrl}`);

      // Update user metadata with avatar URL using admin client
      const { data: updateData, error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            avatar_url: publicUrl,
          },
        });

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ User profile updated with avatar URL`);

      res.json({
        success: true,
        message: "Avatar uploaded successfully",
        data: {
          avatar_url: publicUrl,
          file_size: file.size,
          file_size_mb: (file.size / (1024 * 1024)).toFixed(2),
          mime_type: file.mimetype,
        },
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload avatar",
        details: error.message,
      });
    }
  }
);

// DELETE /api/auth/avatar - Delete user avatar
router.delete("/avatar", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userToken = req.token;
    const userSupabase = getSupabaseClient(userToken);

    console.log(`🗑️  User ${req.user.email} deleting avatar`);

    // Get current avatar URL using the main supabase client
    const { data: userData, error: getUserError } = await supabase.auth.getUser(
      userToken
    );

    if (getUserError || !userData.user) {
      return res.status(401).json({
        success: false,
        error: "Failed to get user data",
        details: getUserError?.message,
      });
    }

    const avatarUrl = userData.user.user_metadata?.avatar_url;

    if (!avatarUrl) {
      return res.status(404).json({
        success: false,
        error: "No avatar found",
        message: "User does not have an avatar to delete",
      });
    }

    // Extract file path from URL
    const urlParts = avatarUrl.split("/avatars/");
    if (urlParts.length > 1) {
      const filePath = `avatars/${urlParts[1]}`;

      // Delete from storage
      const { error: deleteError } = await userSupabase.storage
        .from("avatars")
        .remove([filePath]);

      if (deleteError) {
        console.error("Storage delete error:", deleteError);
        throw deleteError;
      }

      console.log(`✅ Avatar deleted from storage: ${filePath}`);
    }

    // Remove avatar URL from user metadata using admin client
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          avatar_url: null,
        },
      });

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Avatar URL removed from user profile`);

    res.json({
      success: true,
      message: "Avatar deleted successfully",
    });
  } catch (error) {
    console.error("Avatar delete error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete avatar",
      details: error.message,
    });
  }
});

module.exports = router;
