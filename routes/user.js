const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const multer = require("multer");
const path = require("path");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// Initialize Supabase clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
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

// GET /api/user/profile - Get current user profile
router.get("/profile", async (req, res) => {
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
          emailConfirmed: !!user.confirmed_at,
          phone: user.phone,
          firstName: user.user_metadata?.first_name || null,
          lastName: user.user_metadata?.last_name || null,
          fullName: user.user_metadata?.full_name || null,
          avatarUrl: user.user_metadata?.avatar_url || null,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastSignInAt: user.last_sign_in_at,
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

// POST /api/user/update-profile - Update user profile metadata
router.post("/update-profile", authenticateUser, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user.id;

    // Validate input - at least one field must be provided
    if (firstName === undefined && lastName === undefined) {
      return res.status(400).json({
        success: false,
        error: "No updates provided",
        message:
          "Please provide at least one field to update: firstName or lastName",
      });
    }

    // Validate field types if provided
    if (firstName !== undefined && typeof firstName !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid firstName format",
        message: "firstName must be a string",
      });
    }

    if (lastName !== undefined && typeof lastName !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid lastName format",
        message: "lastName must be a string",
      });
    }

    console.log(`👤 User ${req.user.email} updating profile`);

    // Get current user metadata to preserve existing fields
    const { data: currentUser } = await supabase.auth.getUser(req.token);
    const currentMetadata = currentUser.user?.user_metadata || {};

    // Build update object
    const updatedMetadata = { ...currentMetadata };

    if (firstName !== undefined) {
      updatedMetadata.first_name = firstName.trim();
    }

    if (lastName !== undefined) {
      updatedMetadata.last_name = lastName.trim();
    }

    // Update full_name
    const nameParts = [];
    if (updatedMetadata.first_name) nameParts.push(updatedMetadata.first_name);
    if (updatedMetadata.last_name) nameParts.push(updatedMetadata.last_name);
    updatedMetadata.full_name =
      nameParts.length > 0 ? nameParts.join(" ") : null;

    // Update user metadata using admin client
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: updatedMetadata,
      }
    );

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    console.log(`✅ Profile updated successfully for user ${req.user.email}`);

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.user_metadata?.first_name || null,
          lastName: data.user.user_metadata?.last_name || null,
          fullName: data.user.user_metadata?.full_name || null,
          avatarUrl: data.user.user_metadata?.avatar_url || null,
          updatedAt: data.user.updated_at,
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

// POST /api/user/avatar - Upload or update user avatar
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
          avatarUrl: publicUrl,
          fileSize: file.size,
          fileSizeMb: (file.size / (1024 * 1024)).toFixed(2),
          mimeType: file.mimetype,
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

// DELETE /api/user/avatar - Delete user avatar
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
