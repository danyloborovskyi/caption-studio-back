/**
 * FilesController Tests
 * Tests for file management endpoints
 */

const request = require("supertest");
const File = require("../../models/File");

// Mock dependencies
jest.mock("../../services/ServiceContainer");
jest.mock("@supabase/supabase-js");
jest.mock("../../middleware/auth");

const ServiceContainer = require("../../services/ServiceContainer");

describe("FilesController", () => {
  let app;
  let mockFileRepository;
  let mockUploadService;
  let mockSupabaseClient;

  beforeAll(() => {
    process.env.NODE_ENV = "test";
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock FileRepository
    mockFileRepository = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
    };

    // Mock UploadService
    mockUploadService = {
      deleteFile: jest.fn(),
      bulkDeleteFiles: jest.fn(),
      analyzeExistingFile: jest.fn(),
    };

    // Mock Supabase Client
    mockSupabaseClient = {
      storage: {
        from: jest.fn().mockReturnValue({
          download: jest.fn(),
        }),
      },
    };

    // Mock ServiceContainer
    ServiceContainer.mockImplementation(() => ({
      getFileRepository: () => mockFileRepository,
      getUploadService: () => mockUploadService,
      getSupabaseClient: () => mockSupabaseClient,
    }));

    // Mock auth middleware
    const authMock = require("../../middleware/auth");
    authMock.authenticateUser = (req, res, next) => {
      req.user = { id: "user-123", email: "test@example.com" };
      req.token = "mock-token";
      next();
    };

    // Load app
    delete require.cache[require.resolve("../../server")];
    app = require("../../server");
  });

  describe("GET /api/files", () => {
    it("should list files with default pagination", async () => {
      const mockFiles = [
        new File({
          id: "file-1",
          filename: "test1.jpg",
          mime_type: "image/jpeg",
          file_size: 1024000,
          description: "Test",
          tags: ["test"],
        }),
        new File({
          id: "file-2",
          filename: "test2.png",
          mime_type: "image/png",
          file_size: 2048000,
        }),
      ];

      mockFileRepository.findByUserId.mockResolvedValue({
        files: mockFiles,
        total: 2,
      });

      const response = await request(app)
        .get("/api/files")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        current_page: 1,
        per_page: 20,
        total_items: 2,
        total_pages: 1,
        has_next_page: false,
        has_prev_page: false,
        next_page: null,
        prev_page: null,
      });
      expect(response.body.summary).toEqual({
        total_files: 2,
        page_count: 2,
        files_with_ai: 1,
        image_files: 2,
      });
    });

    it("should list files with custom pagination", async () => {
      const mockFiles = [new File({ id: "file-1", filename: "test1.jpg" })];

      mockFileRepository.findByUserId.mockResolvedValue({
        files: mockFiles,
        total: 25,
      });

      const response = await request(app)
        .get("/api/files?page=2&per_page=10")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        current_page: 2,
        per_page: 10,
        total_items: 25,
        total_pages: 3,
        has_next_page: true,
        has_prev_page: true,
        next_page: 3,
        prev_page: 1,
      });
    });

    it("should filter files by status", async () => {
      mockFileRepository.findByUserId.mockResolvedValue({
        files: [],
        total: 0,
      });

      const response = await request(app)
        .get("/api/files?status=completed")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(mockFileRepository.findByUserId).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          status: "completed",
        })
      );
    });

    it("should sort files by custom field", async () => {
      mockFileRepository.findByUserId.mockResolvedValue({
        files: [],
        total: 0,
      });

      const response = await request(app)
        .get("/api/files?sortBy=filename&sortOrder=asc")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(mockFileRepository.findByUserId).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          sortBy: "filename",
          sortOrder: "asc",
        })
      );
    });
  });

  describe("GET /api/files/images", () => {
    it("should list only image files", async () => {
      const mockFiles = [
        new File({
          id: "file-1",
          filename: "test1.jpg",
          mime_type: "image/jpeg",
        }),
        new File({
          id: "file-2",
          filename: "test2.pdf",
          mime_type: "application/pdf",
        }),
      ];

      mockFileRepository.findByUserId.mockResolvedValue({
        files: mockFiles,
        total: 2,
      });

      const response = await request(app)
        .get("/api/files/images")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isImage).toBe(true);
      expect(response.body.summary.total_images).toBe(2);
    });
  });

  describe("GET /api/files/stats", () => {
    it("should return file statistics", async () => {
      const mockFiles = [
        new File({
          id: "file-1",
          mime_type: "image/jpeg",
          file_size: 1024 * 1024, // 1 MB
          status: "completed",
          description: "Test",
        }),
        new File({
          id: "file-2",
          mime_type: "image/png",
          file_size: 2 * 1024 * 1024, // 2 MB
          status: "processing",
        }),
        new File({
          id: "file-3",
          mime_type: "video/mp4",
          file_size: 5 * 1024 * 1024, // 5 MB
          status: "completed",
        }),
      ];

      mockFileRepository.findByUserId.mockResolvedValue({
        files: mockFiles,
      });

      const response = await request(app)
        .get("/api/files/stats")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        total_files: 3,
        files_with_ai_analysis: 1,
        status_distribution: {
          completed: 2,
          processing: 1,
        },
        file_type_distribution: {
          image: 2,
          video: 1,
        },
      });
      expect(response.body.data.storage_usage).toHaveProperty("total_bytes");
      expect(response.body.data.storage_usage).toHaveProperty("total_mb");
      expect(response.body.data.storage_usage.total_mb).toBe(8);
    });
  });

  describe("GET /api/files/search", () => {
    it("should reject search without query parameter", async () => {
      const response = await request(app)
        .get("/api/files/search")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Search query");
    });

    it("should search files successfully", async () => {
      const mockFiles = [
        new File({ id: "file-1", filename: "sunset.jpg" }),
        new File({ id: "file-2", filename: "sunrise.jpg" }),
      ];

      mockFileRepository.search.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get("/api/files/search?q=sun")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.search).toEqual({
        query: "sun",
        type_filter: "all",
        results_found: 2,
      });
      expect(mockFileRepository.search).toHaveBeenCalledWith(
        "user-123",
        "sun",
        { type: undefined }
      );
    });

    it("should search with type filter", async () => {
      mockFileRepository.search.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/files/search?q=test&type=image")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(mockFileRepository.search).toHaveBeenCalledWith(
        "user-123",
        "test",
        { type: "image" }
      );
    });

    it("should paginate search results", async () => {
      const mockFiles = Array.from(
        { length: 25 },
        (_, i) => new File({ id: `file-${i}`, filename: `test${i}.jpg` })
      );

      mockFileRepository.search.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get("/api/files/search?q=test&page=2&per_page=10")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toMatchObject({
        current_page: 2,
        per_page: 10,
        total_items: 25,
        total_pages: 3,
      });
    });
  });

  describe("GET /api/files/:id", () => {
    it("should get single file successfully", async () => {
      const mockFile = new File({
        id: "file-123",
        filename: "test.jpg",
        mime_type: "image/jpeg",
      });

      mockFileRepository.findById.mockResolvedValue(mockFile);

      const response = await request(app)
        .get("/api/files/file-123")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe("file-123");
      expect(mockFileRepository.findById).toHaveBeenCalledWith(
        "file-123",
        "user-123"
      );
    });

    it("should return 400 for non-existent file", async () => {
      mockFileRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/files/nonexistent")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("File not found");
    });
  });

  describe("PATCH /api/files/:id", () => {
    it("should reject update without any fields", async () => {
      const response = await request(app)
        .patch("/api/files/file-123")
        .set("Authorization", "Bearer mock-token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("No updates provided");
    });

    it("should update filename successfully", async () => {
      const mockFile = new File({ id: "file-123", filename: "old.jpg" });
      const updatedFile = new File({ id: "file-123", filename: "new.jpg" });

      mockFileRepository.findById.mockResolvedValue(mockFile);
      mockFileRepository.update.mockResolvedValue(updatedFile);

      const response = await request(app)
        .patch("/api/files/file-123")
        .set("Authorization", "Bearer mock-token")
        .send({ filename: "new.jpg" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.filename).toBe("new.jpg");
    });

    it("should reject empty filename", async () => {
      const mockFile = new File({ id: "file-123", filename: "test.jpg" });
      mockFileRepository.findById.mockResolvedValue(mockFile);

      const response = await request(app)
        .patch("/api/files/file-123")
        .set("Authorization", "Bearer mock-token")
        .send({ filename: "   " });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Filename cannot be empty");
    });

    it("should update description and tags", async () => {
      const mockFile = new File({ id: "file-123" });
      const updatedFile = new File({
        id: "file-123",
        description: "New description",
        tags: ["tag1", "tag2"],
      });

      mockFileRepository.findById.mockResolvedValue(mockFile);
      mockFileRepository.update.mockResolvedValue(updatedFile);

      const response = await request(app)
        .patch("/api/files/file-123")
        .set("Authorization", "Bearer mock-token")
        .send({
          description: "New description",
          tags: ["tag1", "tag2"],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe("New description");
    });

    it("should return 400 for non-existent file", async () => {
      mockFileRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .patch("/api/files/nonexistent")
        .set("Authorization", "Bearer mock-token")
        .send({ filename: "new.jpg" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("File not found");
    });
  });

  describe("DELETE /api/files/:id", () => {
    it("should delete file successfully", async () => {
      mockUploadService.deleteFile.mockResolvedValue(true);

      const response = await request(app)
        .delete("/api/files/file-123")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("deleted successfully");
      expect(response.body.data.id).toBe("file-123");
      expect(mockUploadService.deleteFile).toHaveBeenCalledWith(
        "file-123",
        "user-123"
      );
    });
  });

  describe("DELETE /api/files (bulk delete)", () => {
    it("should reject request without ids array", async () => {
      const response = await request(app)
        .delete("/api/files")
        .set("Authorization", "Bearer mock-token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid or empty ids array");
    });

    it("should reject empty ids array", async () => {
      const response = await request(app)
        .delete("/api/files")
        .set("Authorization", "Bearer mock-token")
        .send({ ids: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid or empty ids array");
    });

    it("should reject more than 100 files", async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `file-${i}`);

      const response = await request(app)
        .delete("/api/files")
        .set("Authorization", "Bearer mock-token")
        .send({ ids });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Maximum 100 files");
    });

    it("should delete multiple files successfully", async () => {
      mockUploadService.bulkDeleteFiles.mockResolvedValue(3);

      const response = await request(app)
        .delete("/api/files")
        .set("Authorization", "Bearer mock-token")
        .send({ ids: ["file-1", "file-2", "file-3"] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted_count).toBe(3);
      expect(response.body.data.requested_count).toBe(3);
    });
  });

  describe("POST /api/files/:id/regenerate", () => {
    it("should regenerate AI analysis successfully", async () => {
      const mockFile = new File({
        id: "file-123",
        filename: "test.jpg",
        description: "New AI description",
        tags: ["ai-tag"],
      });

      mockUploadService.analyzeExistingFile.mockResolvedValue({
        file: mockFile,
      });

      const response = await request(app)
        .post("/api/files/file-123/regenerate")
        .set("Authorization", "Bearer mock-token")
        .send({ tagStyle: "descriptive" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("regenerated successfully");
      expect(mockUploadService.analyzeExistingFile).toHaveBeenCalledWith(
        "file-123",
        "user-123",
        "descriptive"
      );
    });

    it("should use default tagStyle if not provided", async () => {
      const mockFile = new File({ id: "file-123" });

      mockUploadService.analyzeExistingFile.mockResolvedValue({
        file: mockFile,
      });

      const response = await request(app)
        .post("/api/files/file-123/regenerate")
        .set("Authorization", "Bearer mock-token")
        .send({});

      expect(response.status).toBe(200);
      expect(mockUploadService.analyzeExistingFile).toHaveBeenCalledWith(
        "file-123",
        "user-123",
        "neutral"
      );
    });
  });

  describe("POST /api/files/regenerate (bulk)", () => {
    it("should reject request without ids array", async () => {
      const response = await request(app)
        .post("/api/files/regenerate")
        .set("Authorization", "Bearer mock-token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid or empty ids array");
    });

    it("should reject more than 20 files", async () => {
      const ids = Array.from({ length: 21 }, (_, i) => `file-${i}`);

      const response = await request(app)
        .post("/api/files/regenerate")
        .set("Authorization", "Bearer mock-token")
        .send({ ids });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Maximum 20 files");
    });

    it("should regenerate multiple files successfully", async () => {
      const mockFile1 = new File({ id: "file-1", filename: "test1.jpg" });
      const mockFile2 = new File({ id: "file-2", filename: "test2.jpg" });

      mockUploadService.analyzeExistingFile
        .mockResolvedValueOnce({ file: mockFile1 })
        .mockResolvedValueOnce({ file: mockFile2 });

      const response = await request(app)
        .post("/api/files/regenerate")
        .set("Authorization", "Bearer mock-token")
        .send({ ids: ["file-1", "file-2"], tagStyle: "descriptive" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.regenerated).toHaveLength(2);
      expect(response.body.data.totalRegenerated).toBe(2);
      expect(response.body.data.totalFailed).toBe(0);
    });

    it("should handle partial failures with 207 status", async () => {
      const mockFile = new File({ id: "file-1" });

      mockUploadService.analyzeExistingFile
        .mockResolvedValueOnce({ file: mockFile })
        .mockRejectedValueOnce(new Error("Analysis failed"));

      const response = await request(app)
        .post("/api/files/regenerate")
        .set("Authorization", "Bearer mock-token")
        .send({ ids: ["file-1", "file-2"] });

      expect(response.status).toBe(207);
      expect(response.body.data.totalRegenerated).toBe(1);
      expect(response.body.data.totalFailed).toBe(1);
      expect(response.body.data.errors).toHaveLength(1);
    });

    it("should return 400 if all files fail", async () => {
      mockUploadService.analyzeExistingFile
        .mockRejectedValueOnce(new Error("Failed 1"))
        .mockRejectedValueOnce(new Error("Failed 2"));

      const response = await request(app)
        .post("/api/files/regenerate")
        .set("Authorization", "Bearer mock-token")
        .send({ ids: ["file-1", "file-2"] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.data.totalFailed).toBe(2);
    });
  });

  describe("PATCH /api/files (bulk update)", () => {
    it("should reject request without files array", async () => {
      const response = await request(app)
        .patch("/api/files")
        .set("Authorization", "Bearer mock-token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid or empty files array");
    });

    it("should reject more than 50 files", async () => {
      const files = Array.from({ length: 51 }, (_, i) => ({
        id: `file-${i}`,
        filename: `test${i}.jpg`,
      }));

      const response = await request(app)
        .patch("/api/files")
        .set("Authorization", "Bearer mock-token")
        .send({ files });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Maximum 50 files");
    });

    it("should update multiple files successfully", async () => {
      const mockFile1 = new File({ id: "file-1", filename: "updated1.jpg" });
      const mockFile2 = new File({ id: "file-2", filename: "updated2.jpg" });

      mockFileRepository.update
        .mockResolvedValueOnce(mockFile1)
        .mockResolvedValueOnce(mockFile2);

      const response = await request(app)
        .patch("/api/files")
        .set("Authorization", "Bearer mock-token")
        .send({
          files: [
            { id: "file-1", filename: "updated1.jpg" },
            { id: "file-2", filename: "updated2.jpg" },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toHaveLength(2);
      expect(response.body.data.totalUpdated).toBe(2);
    });

    it("should handle partial failures", async () => {
      const mockFile = new File({ id: "file-1" });

      mockFileRepository.update
        .mockResolvedValueOnce(mockFile)
        .mockRejectedValueOnce(new Error("Update failed"));

      const response = await request(app)
        .patch("/api/files")
        .set("Authorization", "Bearer mock-token")
        .send({
          files: [
            { id: "file-1", filename: "test1.jpg" },
            { id: "file-2", filename: "test2.jpg" },
          ],
        });

      expect(response.status).toBe(207);
      expect(response.body.data.totalUpdated).toBe(1);
      expect(response.body.data.totalFailed).toBe(1);
    });

    it("should handle missing file ID", async () => {
      const response = await request(app)
        .patch("/api/files")
        .set("Authorization", "Bearer mock-token")
        .send({
          files: [{ filename: "test.jpg" }],
        });

      expect(response.status).toBe(400);
      expect(response.body.data.errors[0].error).toContain("ID is required");
    });

    it("should reject empty filename", async () => {
      const response = await request(app)
        .patch("/api/files")
        .set("Authorization", "Bearer mock-token")
        .send({
          files: [{ id: "file-1", filename: "   " }],
        });

      expect(response.status).toBe(400);
      expect(response.body.data.errors[0].error).toContain("cannot be empty");
    });
  });

  describe("GET /api/files/:id/download", () => {
    it("should download file successfully", async () => {
      const mockFile = new File({
        id: "file-123",
        filename: "test.jpg",
        mime_type: "image/jpeg",
        file_path: "user-123/test.jpg",
      });

      mockFileRepository.findById.mockResolvedValue(mockFile);

      // Mock storage download
      const mockBuffer = Buffer.from("fake-image-data");
      const mockBlob = new Blob([mockBuffer]);
      mockSupabaseClient.storage.from().download.mockResolvedValue({
        data: mockBlob,
        error: null,
      });

      const response = await request(app)
        .get("/api/files/file-123/download")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("image/jpeg");
      expect(response.headers["content-disposition"]).toContain("test.jpg");
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith("uploads");
    });

    it("should return 400 for non-existent file", async () => {
      mockFileRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/files/nonexistent/download")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("File not found");
    });

    it("should handle storage download errors", async () => {
      const mockFile = new File({
        id: "file-123",
        filename: "test.jpg",
        file_path: "user-123/test.jpg",
      });

      mockFileRepository.findById.mockResolvedValue(mockFile);

      mockSupabaseClient.storage.from().download.mockResolvedValue({
        data: null,
        error: { message: "Storage error" },
      });

      const response = await request(app)
        .get("/api/files/file-123/download")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Failed to download");
    });
  });

  describe("POST /api/files/download (bulk)", () => {
    it("should reject request without ids array", async () => {
      const response = await request(app)
        .post("/api/files/download")
        .set("Authorization", "Bearer mock-token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("File IDs array is required");
    });

    it("should reject empty ids array", async () => {
      const response = await request(app)
        .post("/api/files/download")
        .set("Authorization", "Bearer mock-token")
        .send({ ids: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("File IDs array is required");
    });

    it("should reject more than 100 files", async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `file-${i}`);

      const response = await request(app)
        .post("/api/files/download")
        .set("Authorization", "Bearer mock-token")
        .send({ ids });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Maximum 100 files");
    });

    it("should create zip archive with multiple files", async () => {
      const mockFiles = [
        new File({
          id: "file-1",
          filename: "test1.jpg",
          file_path: "user-123/test1.jpg",
        }),
        new File({
          id: "file-2",
          filename: "test2.jpg",
          file_path: "user-123/test2.jpg",
        }),
      ];

      mockFileRepository.findById
        .mockResolvedValueOnce(mockFiles[0])
        .mockResolvedValueOnce(mockFiles[1]);

      // Mock storage downloads
      const mockBuffer1 = Buffer.from("image-1");
      const mockBuffer2 = Buffer.from("image-2");
      mockSupabaseClient.storage
        .from()
        .download.mockResolvedValueOnce({
          data: new Blob([mockBuffer1]),
          error: null,
        })
        .mockResolvedValueOnce({
          data: new Blob([mockBuffer2]),
          error: null,
        });

      const response = await request(app)
        .post("/api/files/download")
        .set("Authorization", "Bearer mock-token")
        .send({ ids: ["file-1", "file-2"] });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("application/zip");
      expect(response.headers["content-disposition"]).toContain(".zip");
    });

    it("should handle files that don't exist", async () => {
      mockFileRepository.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/files/download")
        .set("Authorization", "Bearer mock-token")
        .send({ ids: ["nonexistent-1", "nonexistent-2"] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("No valid files found");
    });

    it("should handle partial download failures", async () => {
      const mockFile1 = new File({
        id: "file-1",
        filename: "test1.jpg",
        file_path: "user-123/test1.jpg",
      });
      const mockFile2 = new File({
        id: "file-2",
        filename: "test2.jpg",
        file_path: "user-123/test2.jpg",
      });

      mockFileRepository.findById
        .mockResolvedValueOnce(mockFile1)
        .mockResolvedValueOnce(mockFile2);

      // First download succeeds, second fails
      mockSupabaseClient.storage
        .from()
        .download.mockResolvedValueOnce({
          data: new Blob([Buffer.from("image-1")]),
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Download failed" },
        });

      const response = await request(app)
        .post("/api/files/download")
        .set("Authorization", "Bearer mock-token")
        .send({ ids: ["file-1", "file-2"] });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("application/zip");
      // ZIP should still be created with at least the successful file
    });

    it("should handle filename collisions", async () => {
      const mockFiles = [
        new File({
          id: "file-1",
          filename: "test.jpg",
          file_path: "user-123/test1.jpg",
        }),
        new File({
          id: "file-2",
          filename: "test.jpg",
          file_path: "user-123/test2.jpg",
        }),
      ];

      mockFileRepository.findById
        .mockResolvedValueOnce(mockFiles[0])
        .mockResolvedValueOnce(mockFiles[1]);

      mockSupabaseClient.storage
        .from()
        .download.mockResolvedValueOnce({
          data: new Blob([Buffer.from("image-1")]),
          error: null,
        })
        .mockResolvedValueOnce({
          data: new Blob([Buffer.from("image-2")]),
          error: null,
        });

      const response = await request(app)
        .post("/api/files/download")
        .set("Authorization", "Bearer mock-token")
        .send({ ids: ["file-1", "file-2"] });

      expect(response.status).toBe(200);
      // Should create ZIP with renamed files (test.jpg and test-1.jpg)
    });
  });
});
