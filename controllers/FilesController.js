/**
 * Files Controller
 * Handles HTTP requests for file management operations
 * Thin layer that delegates to services
 */

const ServiceContainer = require("../services/ServiceContainer");
const { asyncHandler, ValidationError } = require("../utils/errorHandler");
const archiver = require("archiver");

class FilesController {
  /**
   * GET /api/files - List all files with pagination
   */
  static listFiles = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userToken = req.token;
    const {
      page = 1,
      per_page = 20,
      status,
      sortBy = "uploaded_at",
      sortOrder = "desc",
    } = req.query;

    const container = new ServiceContainer(userToken);
    const fileRepository = container.getFileRepository();

    const { files, total } = await fileRepository.findByUserId(userId, {
      page: parseInt(page),
      perPage: parseInt(per_page),
      status,
      sortBy,
      sortOrder,
    });

    const pageNum = parseInt(page);
    const perPageNum = parseInt(per_page);
    const totalPages = Math.ceil(total / perPageNum);

    res.json({
      success: true,
      data: files.map((f) => f.toJSON()),
      pagination: {
        current_page: pageNum,
        per_page: perPageNum,
        total_items: total,
        total_pages: totalPages,
        has_next_page: pageNum < totalPages,
        has_prev_page: pageNum > 1,
        next_page: pageNum < totalPages ? pageNum + 1 : null,
        prev_page: pageNum > 1 ? pageNum - 1 : null,
      },
      filters: {
        status: status || "all",
        sort_by: sortBy,
        sort_order: sortOrder,
      },
      summary: {
        total_files: total,
        page_count: files.length,
        files_with_ai: files.filter((f) => f.hasAIAnalysis()).length,
        image_files: files.filter((f) => f.isImage()).length,
      },
    });
  });

  /**
   * GET /api/files/images - List images only
   */
  static listImages = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userToken = req.token;
    const {
      page = 1,
      per_page = 20,
      sortBy = "uploaded_at",
      sortOrder = "desc",
    } = req.query;

    const container = new ServiceContainer(userToken);
    const fileRepository = container.getFileRepository();

    const { files, total } = await fileRepository.findByUserId(userId, {
      page: parseInt(page),
      perPage: parseInt(per_page),
      sortBy,
      sortOrder,
    });

    // Filter images
    const images = files.filter((f) => f.isImage());
    const imageCount = total; // This should be refined if needed

    res.json({
      success: true,
      data: images.map((f) => f.toJSON()),
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(per_page),
        total_items: imageCount,
        total_pages: Math.ceil(imageCount / parseInt(per_page)),
      },
      summary: {
        total_images: imageCount,
        page_count: images.length,
        images_with_ai: images.filter((f) => f.hasAIAnalysis()).length,
      },
    });
  });

  /**
   * GET /api/files/stats - Get file statistics
   */
  static getStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userToken = req.token;

    const container = new ServiceContainer(userToken);
    const fileRepository = container.getFileRepository();

    const { files } = await fileRepository.findByUserId(userId, {});

    // Calculate stats
    const statusCounts = files.reduce((acc, file) => {
      const status = file.status || "uploaded";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const typeDistribution = files.reduce((acc, file) => {
      const type = file.mimeType?.split("/")[0] || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const totalBytes = files.reduce(
      (sum, file) => sum + (file.fileSize || 0),
      0
    );
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      data: {
        total_files: files.length,
        files_with_ai_analysis: files.filter((f) => f.hasAIAnalysis()).length,
        status_distribution: statusCounts,
        file_type_distribution: typeDistribution,
        storage_usage: {
          total_bytes: totalBytes,
          total_mb: parseFloat(totalMB),
          total_gb: parseFloat(totalGB),
          human_readable: totalGB > 1 ? `${totalGB} GB` : `${totalMB} MB`,
        },
        timestamp: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /api/files/search - Search files
   */
  static searchFiles = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userToken = req.token;
    const { q: searchQuery, type, page = 1, per_page = 20 } = req.query;

    if (!searchQuery) {
      throw new ValidationError("Search query (q) parameter is required");
    }

    const container = new ServiceContainer(userToken);
    const fileRepository = container.getFileRepository();

    const files = await fileRepository.search(userId, searchQuery, { type });

    // Pagination
    const pageNum = parseInt(page);
    const perPageNum = parseInt(per_page);
    const offset = (pageNum - 1) * perPageNum;
    const paginatedFiles = files.slice(offset, offset + perPageNum);

    res.json({
      success: true,
      data: paginatedFiles.map((f) => f.toJSON()),
      search: {
        query: searchQuery,
        type_filter: type || "all",
        results_found: files.length,
      },
      pagination: {
        current_page: pageNum,
        per_page: perPageNum,
        total_items: files.length,
        total_pages: Math.ceil(files.length / perPageNum),
      },
    });
  });

  /**
   * GET /api/files/:id - Get single file
   */
  static getFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userToken = req.token;

    const container = new ServiceContainer(userToken);
    const fileRepository = container.getFileRepository();

    const file = await fileRepository.findById(id, userId);

    if (!file) {
      throw new ValidationError("File not found");
    }

    res.json({
      success: true,
      data: file.toJSON(),
    });
  });

  /**
   * PATCH /api/files/:id - Update file metadata
   */
  static updateFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { filename, description, tags } = req.body;
    const userId = req.user.id;
    const userToken = req.token;

    // Validate input
    if (
      filename === undefined &&
      description === undefined &&
      tags === undefined
    ) {
      throw new ValidationError("No updates provided");
    }

    const container = new ServiceContainer(userToken);
    const fileRepository = container.getFileRepository();

    // Verify file exists
    const file = await fileRepository.findById(id, userId);
    if (!file) {
      throw new ValidationError("File not found or access denied");
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (filename !== undefined) {
      const trimmedFilename = filename.trim();
      if (trimmedFilename === "") {
        throw new ValidationError("Filename cannot be empty");
      }
      updateData.filename = trimmedFilename;
    }
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;

    const updatedFile = await fileRepository.update(id, userId, updateData);

    res.json({
      success: true,
      message: "File metadata updated successfully",
      data: updatedFile.toJSON(),
    });
  });

  /**
   * DELETE /api/files/:id - Delete file
   */
  static deleteFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userToken = req.token;

    const container = new ServiceContainer(userToken);
    const uploadService = container.getUploadService();

    await uploadService.deleteFile(id, userId);

    res.json({
      success: true,
      message: "File deleted successfully",
      data: { id },
    });
  });

  /**
   * DELETE /api/files - Bulk delete files
   */
  static bulkDelete = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const userId = req.user.id;
    const userToken = req.token;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError("Invalid or empty ids array");
    }

    if (ids.length > 100) {
      throw new ValidationError("Maximum 100 files can be deleted at once");
    }

    const container = new ServiceContainer(userToken);
    const uploadService = container.getUploadService();

    const deletedCount = await uploadService.bulkDeleteFiles(ids, userId);

    res.json({
      success: true,
      message: `${deletedCount} files deleted successfully`,
      data: {
        deleted_count: deletedCount,
        requested_count: ids.length,
      },
    });
  });

  /**
   * GET /api/files/:id/download - Download single file
   */
  static downloadFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userToken = req.token;
    const container = new ServiceContainer(userToken);
    const supabase = container.getSupabaseClient();
    const fileRepository = container.getFileRepository();

    // Get file and verify ownership
    const file = await fileRepository.findById(id, userId);
    if (!file) {
      throw new ValidationError("File not found or access denied");
    }

    // Download from storage
    const { data: fileData, error } = await supabase.storage
      .from("uploads")
      .download(file.filePath);

    if (error) {
      throw new ValidationError(`Failed to download file: ${error.message}`);
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Set headers
    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.filename)}"`
    );
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  });

  /**
   * POST /api/files/download - Bulk download files as ZIP
   */
  static bulkDownload = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const userId = req.user.id;
    const userToken = req.token;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError("File IDs array is required");
    }

    if (ids.length > 100) {
      throw new ValidationError("Maximum 100 files allowed per download");
    }

    const container = new ServiceContainer(userToken);
    const supabase = container.getSupabaseClient();
    const fileRepository = container.getFileRepository();

    // Get all files and verify ownership
    const files = await Promise.all(
      ids.map((id) => fileRepository.findById(id, userId))
    );

    const validFiles = files.filter((f) => f !== null);

    if (validFiles.length === 0) {
      throw new ValidationError("No valid files found to download");
    }

    // Set response headers
    const timestamp = new Date().toISOString().split("T")[0];
    const zipFilename = `files-${timestamp}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${zipFilename}"`
    );

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    // Pipe archive to response
    archive.pipe(res);

    // Track errors and used filenames
    const errors = [];
    const usedFilenames = new Set();
    let successCount = 0;

    // Add files to archive
    for (const file of validFiles) {
      try {
        // Download from storage
        const { data: fileData, error } = await supabase.storage
          .from("uploads")
          .download(file.filePath);

        if (error) {
          errors.push({
            id: file.id,
            filename: file.filename,
            error: error.message || "Download failed",
          });
          continue;
        }

        // Convert blob to buffer
        const buffer = Buffer.from(await fileData.arrayBuffer());

        // Add to archive with collision handling
        let archiveFilename = file.filename;
        let counter = 1;

        // Handle filename collisions
        while (usedFilenames.has(archiveFilename)) {
          const extIndex = file.filename.lastIndexOf(".");
          if (extIndex > 0) {
            const name = file.filename.substring(0, extIndex);
            const ext = file.filename.substring(extIndex);
            archiveFilename = `${name}-${counter}${ext}`;
          } else {
            archiveFilename = `${file.filename}-${counter}`;
          }
          counter++;
        }

        usedFilenames.add(archiveFilename);
        archive.append(buffer, { name: archiveFilename });
        successCount++;
      } catch (error) {
        errors.push({
          id: file.id,
          filename: file.filename,
          error: error.message || String(error),
        });
      }
    }

    // Add error summary if there were any errors
    if (errors.length > 0) {
      const errorSummary = `Download Summary:\n\nSuccessful: ${successCount} files\nFailed: ${
        errors.length
      } files\n\nErrors:\n${errors
        .map((e) => `- ${e.filename}: ${e.error}`)
        .join("\n")}`;
      archive.append(Buffer.from(errorSummary), {
        name: "download-errors.txt",
      });
    }

    // Finalize archive
    await archive.finalize();
  });

  /**
   * POST /api/files/regenerate - Bulk regenerate AI analysis
   */
  static bulkRegenerateAI = asyncHandler(async (req, res) => {
    const { ids, tagStyle = "neutral" } = req.body;
    const userId = req.user.id;
    const userToken = req.token;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError("Invalid or empty ids array");
    }

    if (ids.length > 20) {
      throw new ValidationError("Maximum 20 files can be regenerated at once");
    }

    const container = new ServiceContainer(userToken);
    const uploadService = container.getUploadService();

    // Process all files in parallel using Promise.allSettled
    const startTime = Date.now();
    const promises = ids.map((id) =>
      uploadService
        .analyzeExistingFile(id, userId, tagStyle)
        .then((result) => ({ status: "fulfilled", id, file: result.file }))
        .catch((error) => ({ status: "rejected", id, error: error.message }))
    );

    const settledResults = await Promise.all(promises);
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Separate successful results and errors
    const results = [];
    const errors = [];

    settledResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(result.file.toJSON());
      } else {
        errors.push({ id: result.id, error: result.error });
      }
    });

    const statusCode =
      errors.length > 0 ? (results.length > 0 ? 207 : 400) : 200;

    res.status(statusCode).json({
      success: results.length > 0,
      message: `${results.length} of ${ids.length} files regenerated successfully`,
      data: {
        regenerated: results,
        errors,
        totalRegenerated: results.length,
        totalFailed: errors.length,
        totalRequested: ids.length,
        processingTimeSeconds: parseFloat(processingTime),
      },
    });
  });

  /**
   * POST /api/files/:id/regenerate - Regenerate AI analysis for single file
   */
  static regenerateAI = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { tagStyle = "neutral" } = req.body;
    const userId = req.user.id;
    const userToken = req.token;

    const container = new ServiceContainer(userToken);
    const uploadService = container.getUploadService();

    const { file } = await uploadService.analyzeExistingFile(
      id,
      userId,
      tagStyle
    );

    res.json({
      success: true,
      message: "AI analysis regenerated successfully",
      data: file.toJSON(),
    });
  });

  /**
   * PATCH /api/files - Bulk update files
   */
  static bulkUpdate = asyncHandler(async (req, res) => {
    const { files } = req.body;
    const userId = req.user.id;
    const userToken = req.token;

    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new ValidationError("Invalid or empty files array");
    }

    if (files.length > 50) {
      throw new ValidationError("Maximum 50 files can be updated at once");
    }

    const container = new ServiceContainer(userToken);
    const fileRepository = container.getFileRepository();

    const updated = [];
    const errors = [];

    for (const fileUpdate of files) {
      try {
        const { id, filename, description, tags } = fileUpdate;

        if (!id) {
          errors.push({ id: null, error: "File ID is required" });
          continue;
        }

        const updateData = { updated_at: new Date().toISOString() };

        if (filename !== undefined) {
          const trimmedFilename = filename.trim();
          if (trimmedFilename === "") {
            throw new Error("Filename cannot be empty");
          }
          updateData.filename = trimmedFilename;
        }
        if (description !== undefined) updateData.description = description;
        if (tags !== undefined) updateData.tags = tags;

        const updatedFile = await fileRepository.update(id, userId, updateData);
        updated.push(updatedFile.toJSON());
      } catch (error) {
        errors.push({
          id: fileUpdate?.id || null,
          error: error.message,
        });
      }
    }

    const statusCode =
      errors.length > 0 ? (updated.length > 0 ? 207 : 400) : 200;

    res.status(statusCode).json({
      success: updated.length > 0,
      message: `${updated.length} of ${files.length} files updated successfully`,
      data: {
        updated,
        errors,
        totalUpdated: updated.length,
        totalFailed: errors.length,
        totalRequested: files.length,
      },
    });
  });
}

module.exports = FilesController;
