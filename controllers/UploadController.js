/**
 * Upload Controller
 * Handles HTTP requests for file uploads
 * Thin layer that delegates to services
 */

const ServiceContainer = require("../services/ServiceContainer");
const { asyncHandler } = require("../utils/errorHandler");

class UploadController {
  /**
   * Upload a single file with optional AI analysis
   * POST /api/upload/image
   */
  static uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    const userId = req.user.id;
    const userToken = req.token;
    const { tagStyle = "neutral" } = req.body;

    // Initialize service container with user context
    const container = new ServiceContainer(userToken);
    const uploadService = container.getUploadService();

    // Process upload
    const { file, aiResult } = await uploadService.uploadAndProcess(
      req.file,
      userId,
      { tagStyle, analyzeWithAI: false }
    );

    res.json({
      success: true,
      message: "Image uploaded successfully",
      data: file.toJSON(),
    });
  });

  /**
   * Upload and analyze image immediately
   * POST /api/upload/upload-and-analyze
   */
  static uploadAndAnalyze = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    const userId = req.user.id;
    const userToken = req.token;
    const { tagStyle = "neutral" } = req.body;

    const container = new ServiceContainer(userToken);
    const uploadService = container.getUploadService();

    const { file, aiResult } = await uploadService.uploadAndProcess(
      req.file,
      userId,
      { tagStyle, analyzeWithAI: true }
    );

    res.json({
      success: true,
      message: "Image uploaded and analyzed successfully",
      data: {
        ...file.toJSON(),
        analysis: {
          success: aiResult?.success || false,
          error: aiResult?.error || null,
        },
      },
    });
  });

  /**
   * Bulk upload with AI analysis
   * POST /api/upload/bulk-upload-and-analyze
   */
  static bulkUploadAndAnalyze = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No image files provided",
      });
    }

    if (req.files.length > 10) {
      return res.status(400).json({
        success: false,
        error: "Maximum 10 images allowed per request",
      });
    }

    const userId = req.user.id;
    const userToken = req.token;
    const { tagStyle = "neutral" } = req.body;

    const container = new ServiceContainer(userToken);
    const uploadService = container.getUploadService();

    const startTime = Date.now();
    const { results, errors } = await uploadService.bulkUploadAndProcess(
      req.files,
      userId,
      { tagStyle, analyzeWithAI: true }
    );

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    const statusCode =
      errors.length > 0 ? (results.length > 0 ? 207 : 500) : 200;

    res.status(statusCode).json({
      success: results.length > 0,
      message: `Processed ${results.length} of ${req.files.length} images`,
      data: {
        successfulUploads: results.length,
        totalAttempts: req.files.length,
        processingTimeSeconds: parseFloat(processingTime),
        results: results.map((r) => r.file.toJSON()),
        errors,
      },
    });
  });

  /**
   * Analyze existing file
   * POST /api/upload/analyze/:id
   */
  static analyzeFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userToken = req.token;
    const { tagStyle = "neutral" } = req.body;

    const container = new ServiceContainer(userToken);
    const uploadService = container.getUploadService();

    const { file, aiResult } = await uploadService.analyzeExistingFile(
      id,
      userId,
      tagStyle
    );

    res.json({
      success: true,
      message: "Image analyzed successfully",
      data: {
        ...file.toJSON(),
        analysis: {
          success: true,
          timestamp: file.updatedAt,
        },
      },
    });
  });
}

module.exports = UploadController;
