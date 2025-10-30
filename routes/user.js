/**
 * User Routes
 * Uses UserController for all operations
 */

const express = require("express");
const multer = require("multer");
const UserController = require("../controllers/UserController");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// Configure multer for avatar uploads
const avatarStorage = multer.memoryStorage();
const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
  },
  fileFilter: (req, file, cb) => {
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
router.get("/profile", UserController.getProfile);

// POST /api/user/update-profile - Update user profile metadata
router.post("/update-profile", authenticateUser, UserController.updateProfile);

// POST /api/user/avatar - Upload or update user avatar
router.post(
  "/avatar",
  authenticateUser,
  avatarUpload.single("avatar"),
  UserController.uploadAvatar
);

// DELETE /api/user/avatar - Delete user avatar
router.delete("/avatar", authenticateUser, UserController.deleteAvatar);

module.exports = router;
