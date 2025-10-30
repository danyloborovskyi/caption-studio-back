/**
 * File Service - Business Logic Layer
 * Separates concerns from route handlers
 */

const crypto = require("crypto");

class FileService {
  /**
   * Generate cryptographically secure random filename
   */
  static generateSecureFilename(originalName, userId) {
    const timestamp = Date.now();
    // Generate enough random bytes to ensure we get at least 6 alphanumeric characters
    const randomString = crypto
      .randomBytes(6)
      .toString("base64")
      .replace(/[+/=]/g, "")
      .substring(0, 6);

    const sanitizedName = FileService.sanitizeFilename(originalName);
    const extension = sanitizedName.split(".").pop().toLowerCase();

    return {
      filename: `${timestamp}-${randomString}.${extension}`,
      path: `images/${userId}/${timestamp}-${randomString}.${extension}`,
      extension,
    };
  }

  /**
   * Sanitize filename to prevent path traversal
   */
  static sanitizeFilename(filename) {
    const basename = filename.replace(/^.*[\\\/]/, "");
    return basename.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  /**
   * Validate file extension
   */
  static validateFileExtension(extension) {
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    return allowedExtensions.includes(extension.toLowerCase());
  }

  /**
   * Validate file size
   */
  static validateFileSize(size, maxSizeMB = 10) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size <= maxSizeBytes;
  }

  /**
   * Get file metadata
   */
  static getFileMetadata(file) {
    return {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      buffer: file.buffer,
    };
  }
}

module.exports = FileService;
