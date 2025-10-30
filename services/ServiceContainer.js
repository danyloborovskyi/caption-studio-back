/**
 * Service Container
 * Simple dependency injection container
 */

const { getSupabaseClient } = require("../config/supabase");
const FileRepository = require("../repositories/FileRepository");
const SupabaseStorageProvider = require("./implementations/SupabaseStorageProvider");
const OpenAIService = require("./implementations/OpenAIService");
const UploadService = require("./UploadService");

class ServiceContainer {
  constructor(userToken) {
    this.userToken = userToken;
    this._services = {};
  }

  /**
   * Get Supabase client for authenticated user
   */
  getSupabaseClient() {
    if (!this._services.supabaseClient) {
      this._services.supabaseClient = getSupabaseClient(this.userToken);
    }
    return this._services.supabaseClient;
  }

  /**
   * Get File Repository
   */
  getFileRepository() {
    if (!this._services.fileRepository) {
      const supabase = this.getSupabaseClient();
      this._services.fileRepository = new FileRepository(supabase);
    }
    return this._services.fileRepository;
  }

  /**
   * Get Storage Provider
   */
  getStorageProvider() {
    if (!this._services.storageProvider) {
      const supabase = this.getSupabaseClient();
      this._services.storageProvider = new SupabaseStorageProvider(supabase);
    }
    return this._services.storageProvider;
  }

  /**
   * Get AI Service
   */
  getAIService() {
    if (!this._services.aiService) {
      this._services.aiService = new OpenAIService(process.env.OPENAI_API_KEY);
    }
    return this._services.aiService;
  }

  /**
   * Get Upload Service (with all dependencies injected)
   */
  getUploadService() {
    if (!this._services.uploadService) {
      const storageProvider = this.getStorageProvider();
      const aiService = this.getAIService();
      const fileRepository = this.getFileRepository();

      this._services.uploadService = new UploadService(
        storageProvider,
        aiService,
        fileRepository
      );
    }
    return this._services.uploadService;
  }
}

module.exports = ServiceContainer;
