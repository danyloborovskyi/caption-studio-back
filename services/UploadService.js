/**
 * Upload Service
 * Handles file upload business logic with dependency injection
 */

const FileService = require("../utils/fileService");
const Logger = require("../utils/logger");
const {
  ValidationError,
  ExternalServiceError,
} = require("../utils/errorHandler");

class UploadService {
  constructor(storageProvider, aiService, fileRepository) {
    this.storageProvider = storageProvider;
    this.aiService = aiService;
    this.fileRepository = fileRepository;
  }

  /**
   * Upload and process a single file
   */
  async uploadAndProcess(file, userId, options = {}) {
    const { tagStyle = "neutral", analyzeWithAI = true } = options;

    // Validate file
    const fileMetadata = FileService.getFileMetadata(file);
    const { filename, path, extension } = FileService.generateSecureFilename(
      fileMetadata.originalName,
      userId
    );

    // Validate extension
    if (!FileService.validateFileExtension(extension)) {
      Logger.security("invalid_file_extension", userId, { extension });
      throw new ValidationError("Invalid file extension", { extension });
    }

    // Validate file size
    if (!FileService.validateFileSize(fileMetadata.size)) {
      Logger.security("file_too_large", userId, { size: fileMetadata.size });
      throw new ValidationError("File size exceeds limit", { maxSize: "10MB" });
    }

    Logger.security("file_upload_attempt", userId, {
      filename,
      size: fileMetadata.size,
      mimeType: fileMetadata.mimeType,
    });

    try {
      // Upload to storage
      const { publicUrl } = await this.storageProvider.uploadFile(
        fileMetadata.buffer,
        path,
        {
          contentType: fileMetadata.mimeType,
          cacheControl: "3600",
        }
      );

      // Create database record
      const fileRecord = await this.fileRepository.create({
        filename: fileMetadata.originalName,
        file_path: path,
        file_size: fileMetadata.size,
        mime_type: fileMetadata.mimeType,
        public_url: publicUrl,
        user_id: userId,
        status: analyzeWithAI ? "processing" : "uploaded",
      });

      Logger.security("file_upload_success", userId, {
        fileId: fileRecord.id,
        filename,
        size: fileMetadata.size,
      });

      // Analyze with AI if requested
      let aiResult = null;
      if (analyzeWithAI && fileRecord.isImage()) {
        aiResult = await this.aiService.analyzeImage(publicUrl, tagStyle);

        if (aiResult.success) {
          await this.fileRepository.update(fileRecord.id, userId, {
            description: aiResult.description,
            tags: aiResult.tags,
            status: "completed",
            updated_at: new Date().toISOString(),
          });

          fileRecord.description = aiResult.description;
          fileRecord.tags = aiResult.tags;
          fileRecord.status = "completed";
        } else {
          await this.fileRepository.update(fileRecord.id, userId, {
            status: "failed",
          });
          fileRecord.status = "failed";
        }
      }

      return {
        file: fileRecord,
        aiResult,
      };
    } catch (error) {
      Logger.error("file_upload_failed", error, { userId, filename });

      if (error.message?.includes("Storage")) {
        throw new ExternalServiceError("Storage", error.message);
      }

      throw error;
    }
  }

  /**
   * Bulk upload and process multiple files
   */
  async bulkUploadAndProcess(files, userId, options = {}) {
    const results = [];
    const errors = [];

    const uploadPromises = files.map(async (file, index) => {
      try {
        const result = await this.uploadAndProcess(file, userId, options);
        return { success: true, data: result };
      } catch (error) {
        Logger.error("bulk_upload_file_failed", error, {
          userId,
          filename: file.originalname,
          index,
        });
        return {
          success: false,
          filename: file.originalname,
          error: error.message,
        };
      }
    });

    const processedResults = await Promise.all(uploadPromises);

    processedResults.forEach((result) => {
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push({
          filename: result.filename,
          error: result.error,
        });
      }
    });

    return { results, errors };
  }

  /**
   * Analyze an existing file with AI
   */
  async analyzeExistingFile(fileId, userId, tagStyle = "neutral") {
    const file = await this.fileRepository.findById(fileId, userId);

    if (!file) {
      throw new ValidationError("File not found");
    }

    if (!file.isImage()) {
      throw new ValidationError("File is not an image");
    }

    Logger.audit("ai_analysis_requested", userId, { fileId });

    // Generate fresh signed URL for AI analysis (old URL might be expired)
    const freshUrl = await this.storageProvider.getPublicUrl(file.filePath);

    const aiResult = await this.aiService.analyzeImage(freshUrl, tagStyle);

    if (aiResult.success) {
      // Update with new signed URL and AI results
      const updatedFile = await this.fileRepository.update(fileId, userId, {
        description: aiResult.description,
        tags: aiResult.tags,
        public_url: freshUrl, // Update with fresh signed URL
        status: "completed",
        updated_at: new Date().toISOString(),
      });

      Logger.audit("ai_analysis_success", userId, { fileId });
      return { file: updatedFile, aiResult };
    } else {
      await this.fileRepository.update(fileId, userId, {
        status: "failed",
      });

      Logger.error("ai_analysis_failed", new Error(aiResult.error), {
        userId,
        fileId,
      });

      throw new ExternalServiceError("AI", aiResult.error);
    }
  }

  /**
   * Refresh signed URL for a file
   */
  async refreshFileUrl(fileId, userId) {
    const file = await this.fileRepository.findById(fileId, userId);

    if (!file) {
      throw new ValidationError("File not found");
    }

    // Generate fresh signed URL
    const freshUrl = await this.storageProvider.getPublicUrl(file.filePath);

    // Update database with fresh URL
    const updatedFile = await this.fileRepository.update(fileId, userId, {
      public_url: freshUrl,
      updated_at: new Date().toISOString(),
    });

    return updatedFile;
  }

  /**
   * Refresh signed URLs for multiple files
   */
  async refreshFileUrls(files, userId) {
    const refreshedFiles = [];

    for (const file of files) {
      try {
        const freshUrl = await this.storageProvider.getPublicUrl(file.filePath);
        file.publicUrl = freshUrl;

        // Update database with fresh URL
        await this.fileRepository.update(file.id, userId, {
          public_url: freshUrl,
        });

        refreshedFiles.push(file);
      } catch (error) {
        Logger.error("Failed to refresh URL", error, {
          userId,
          fileId: file.id,
        });
      }
    }

    return refreshedFiles;
  }

  /**
   * Delete a file (storage + database)
   */
  async deleteFile(fileId, userId) {
    const file = await this.fileRepository.findById(fileId, userId);

    if (!file) {
      throw new ValidationError("File not found");
    }

    // Delete from storage
    await this.storageProvider.deleteFile(file.filePath);

    // Delete from database
    await this.fileRepository.delete(fileId, userId);

    Logger.audit("file_deleted", userId, { fileId, filename: file.filename });

    return true;
  }

  /**
   * Bulk delete files
   */
  async bulkDeleteFiles(fileIds, userId) {
    // Get all files
    const files = await Promise.all(
      fileIds.map((id) => this.fileRepository.findById(id, userId))
    );

    const validFiles = files.filter((f) => f !== null);

    if (validFiles.length === 0) {
      throw new ValidationError("No valid files to delete");
    }

    // Delete from storage
    const paths = validFiles.map((f) => f.filePath);
    await this.storageProvider.deleteFiles(paths);

    // Delete from database
    await this.fileRepository.bulkDelete(fileIds, userId);

    Logger.audit("bulk_delete", userId, { count: validFiles.length });

    return validFiles.length;
  }
}

module.exports = UploadService;
