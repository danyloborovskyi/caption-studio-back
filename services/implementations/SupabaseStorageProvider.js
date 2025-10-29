/**
 * Supabase Storage Provider Implementation
 * Implements IStorageProvider interface for Supabase
 */

const IStorageProvider = require("../interfaces/IStorageProvider");

class SupabaseStorageProvider extends IStorageProvider {
  constructor(supabaseClient, bucketName = "uploads") {
    super();
    this.supabase = supabaseClient;
    this.bucketName = bucketName;
  }

  async uploadFile(buffer, path, options = {}) {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, buffer, {
        contentType: options.contentType || "application/octet-stream",
        cacheControl: options.cacheControl || "3600",
        upsert: options.upsert || false,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Use signed URL for private buckets (expires in 1 year)
    const { data: urlData, error: urlError } = await this.supabase.storage
      .from(this.bucketName)
      .createSignedUrl(path, 31536000); // 1 year in seconds

    if (urlError) {
      throw new Error(`Failed to generate signed URL: ${urlError.message}`);
    }

    return {
      path: data.path,
      publicUrl: urlData.signedUrl,
    };
  }

  async deleteFile(path) {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }

    return true;
  }

  async deleteFiles(paths) {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove(paths);

    if (error) {
      throw new Error(`Bulk storage delete failed: ${error.message}`);
    }

    return true;
  }

  async getPublicUrl(path) {
    // Use signed URL for private buckets (expires in 1 year)
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .createSignedUrl(path, 31536000); // 1 year in seconds

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async fileExists(path) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(path.split("/").slice(0, -1).join("/"));

      if (error) return false;

      const filename = path.split("/").pop();
      return data.some((file) => file.name === filename);
    } catch {
      return false;
    }
  }
}

module.exports = SupabaseStorageProvider;
