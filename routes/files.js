/**
 * Files Routes
 * Uses FilesController for all operations
 */

const express = require("express");
const FilesController = require("../controllers/FilesController");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// Protect all file routes with authentication
router.use(authenticateUser);

// GET /api/files - List all files with pagination
router.get("/", FilesController.listFiles);

// GET /api/files/images - List images only
router.get("/images", FilesController.listImages);

// GET /api/files/stats - Get file statistics
router.get("/stats", FilesController.getStats);

// GET /api/files/search - Search files
router.get("/search", FilesController.searchFiles);

// GET /api/files/:id/download - Download single file
router.get("/:id/download", FilesController.downloadFile);

// GET /api/files/:id - Get single file (must be after specific routes)
router.get("/:id", FilesController.getFile);

// POST /api/files/regenerate - Bulk regenerate AI analysis
router.post("/regenerate", FilesController.bulkRegenerateAI);

// POST /api/files/:id/regenerate - Regenerate AI analysis for single file
router.post("/:id/regenerate", FilesController.regenerateAI);

// PATCH /api/files/:id - Update file metadata
router.patch("/:id", FilesController.updateFile);

// PATCH /api/files - Bulk update files
router.patch("/", FilesController.bulkUpdate);

// DELETE /api/files/:id - Delete file
router.delete("/:id", FilesController.deleteFile);

// DELETE /api/files - Bulk delete files
router.delete("/", FilesController.bulkDelete);

module.exports = router;
