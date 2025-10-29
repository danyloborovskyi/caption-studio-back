/**
 * Storage Provider Interface
 * Defines contract for storage implementations (Supabase, S3, etc.)
 */

class IStorageProvider {
  /**
   * Upload a file to storage
   * @param {Buffer} buffer - File buffer
   * @param {string} path - Storage path
   * @param {Object} options - Upload options (contentType, cacheControl)
   * @returns {Promise<{path: string, publicUrl: string}>}
   */
  async uploadFile(buffer, path, options) {
    throw new Error("Method not implemented");
  }

  /**
   * Delete a file from storage
   * @param {string} path - File path to delete
   * @returns {Promise<boolean>}
   */
  async deleteFile(path) {
    throw new Error("Method not implemented");
  }

  /**
   * Delete multiple files from storage
   * @param {string[]} paths - Array of file paths
   * @returns {Promise<boolean>}
   */
  async deleteFiles(paths) {
    throw new Error("Method not implemented");
  }

  /**
   * Get public URL for a file
   * @param {string} path - File path
   * @returns {Promise<string>}
   */
  async getPublicUrl(path) {
    throw new Error("Method not implemented");
  }

  /**
   * Check if file exists
   * @param {string} path - File path
   * @returns {Promise<boolean>}
   */
  async fileExists(path) {
    throw new Error("Method not implemented");
  }
}

module.exports = IStorageProvider;
