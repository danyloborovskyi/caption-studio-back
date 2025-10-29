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

    const { data: urlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
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
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return data.publicUrl;
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
