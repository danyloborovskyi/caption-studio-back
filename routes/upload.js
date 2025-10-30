/**
 * Upload Routes
 * Uses UploadController for all operations
 */

const express = require("express");
const multer = require("multer");
const UploadController = require("../controllers/UploadController");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

// Protect all upload routes with authentication
router.use(authenticateUser);

// POST /api/upload/image - Upload a single image (no AI analysis)
router.post("/image", upload.single("image"), UploadController.uploadImage);

// POST /api/upload/upload-and-analyze - Upload and analyze immediately
router.post(
  "/upload-and-analyze",
  upload.single("image"),
  UploadController.uploadAndAnalyze
);

// POST /api/upload/bulk-upload-and-analyze - Bulk upload with AI analysis
router.post(
  "/bulk-upload-and-analyze",
  upload.array("images", 10),
  UploadController.bulkUploadAndAnalyze
);

// POST /api/upload/analyze/:id - Analyze existing file
router.post("/analyze/:id", UploadController.analyzeFile);

module.exports = router;
