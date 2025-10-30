/**
 * User Controller
 * Handles HTTP requests for user profile operations
 */

const { createClient } = require("@supabase/supabase-js");
const { asyncHandler, ValidationError } = require("../utils/errorHandler");
const path = require("path");

// Initialize Supabase clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getSupabaseClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

class UserController {
  /**
   * GET /api/user/profile - Get current user profile
   */
  static getProfile = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      throw new ValidationError("No authentication token provided");
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new ValidationError("Invalid or expired token");
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
  });

  /**
   * POST /api/user/update-profile - Update user profile metadata
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const { firstName, lastName } = req.body;
    const userId = req.user.id;

    // Validate input
    if (firstName === undefined && lastName === undefined) {
      throw new ValidationError(
        "Please provide at least one field to update: firstName or lastName"
      );
    }

    // Get current user metadata
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
      throw new ValidationError(error.message);
    }

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
  });

  /**
   * POST /api/user/avatar - Upload or update user avatar
   */
  static uploadAvatar = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userToken = req.token;
    const userSupabase = getSupabaseClient(userToken);

    if (!req.file) {
      throw new ValidationError("Please provide an image file");
    }

    const file = req.file;

    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `${userId}-${Date.now()}${fileExt}`;
    const filePath = `avatars/${userId}/${fileName}`;

    // Delete old avatar if exists
    try {
      const { data: userData, error: getUserError } =
        await supabase.auth.getUser(userToken);

      if (!getUserError && userData.user) {
        const oldAvatarUrl = userData.user.user_metadata?.avatar_url;

        if (oldAvatarUrl) {
          const urlParts = oldAvatarUrl.split("/avatars/");
          if (urlParts.length > 1) {
            const oldFilePath = `avatars/${urlParts[1]}`;
            await userSupabase.storage.from("avatars").remove([oldFilePath]);
          }
        }
      }
    } catch (deleteError) {
      console.log("Note: Could not delete old avatar (may not exist)");
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await userSupabase.storage
      .from("avatars")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new ValidationError(uploadError.message);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = userSupabase.storage.from("avatars").getPublicUrl(filePath);

    // Update user metadata with avatar URL using admin client
    const { data: updateData, error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          avatar_url: publicUrl,
        },
      });

    if (updateError) {
      throw new ValidationError(updateError.message);
    }

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
  });

  /**
   * DELETE /api/user/avatar - Delete user avatar
   */
  static deleteAvatar = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userToken = req.token;
    const userSupabase = getSupabaseClient(userToken);

    // Get current avatar URL
    const { data: userData, error: getUserError } = await supabase.auth.getUser(
      userToken
    );

    if (getUserError || !userData.user) {
      throw new ValidationError("Failed to get user data");
    }

    const avatarUrl = userData.user.user_metadata?.avatar_url;

    if (!avatarUrl) {
      throw new ValidationError("User does not have an avatar to delete");
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
        throw new ValidationError(deleteError.message);
      }
    }

    // Remove avatar URL from user metadata
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          avatar_url: null,
        },
      });

    if (updateError) {
      throw new ValidationError(updateError.message);
    }

    res.json({
      success: true,
      message: "Avatar deleted successfully",
    });
  });
}

module.exports = UserController;
