/**
 * Domain Model: File
 * Represents a file entity in the system
 */

class File {
  constructor(data) {
    this.id = data.id;
    this.filename = data.filename;
    this.filePath = data.file_path || data.filePath;
    this.fileSize = data.file_size || data.fileSize;
    this.mimeType = data.mime_type || data.mimeType;
    this.publicUrl = data.public_url || data.publicUrl;
    this.userId = data.user_id || data.userId;
    this.status = data.status || "uploaded";
    this.description = data.description;
    this.tags = data.tags || [];
    this.uploadedAt = data.uploaded_at || data.uploadedAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  // Domain logic methods
  isImage() {
    return this.mimeType?.startsWith("image/");
  }

  hasAIAnalysis() {
    return !!(this.description || (this.tags && this.tags.length > 0));
  }

  getSizeMB() {
    return this.fileSize ? (this.fileSize / (1024 * 1024)).toFixed(2) : null;
  }

  isProcessing() {
    return this.status === "processing";
  }

  isCompleted() {
    return this.status === "completed";
  }

  isFailed() {
    return this.status === "failed";
  }

  // Convert to API response format
  toJSON() {
    return {
      id: this.id,
      filename: this.filename,
      filePath: this.filePath,
      fileSize: this.fileSize,
      mimeType: this.mimeType,
      publicUrl: this.publicUrl,
      userId: this.userId,
      status: this.status,
      description: this.description,
      tags: this.tags,
      uploadedAt: this.uploadedAt,
      updatedAt: this.updatedAt,
      // Computed properties
      isImage: this.isImage(),
      hasAIAnalysis: this.hasAIAnalysis(),
      fileSizeMB: this.getSizeMB(),
    };
  }

  // Convert to database format
  toDatabase() {
    return {
      id: this.id,
      filename: this.filename,
      file_path: this.filePath,
      file_size: this.fileSize,
      mime_type: this.mimeType,
      public_url: this.publicUrl,
      user_id: this.userId,
      status: this.status,
      description: this.description,
      tags: this.tags,
      uploaded_at: this.uploadedAt,
      updated_at: this.updatedAt,
    };
  }
}

module.exports = File;
