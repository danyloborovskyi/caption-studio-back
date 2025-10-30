/**
 * UploadController Tests
 * Tests for file upload endpoints
 */

const request = require("supertest");
const File = require("../../models/File");

// Mock dependencies
jest.mock("../../services/ServiceContainer");
jest.mock("@supabase/supabase-js");
jest.mock("../../middleware/auth");

const ServiceContainer = require("../../services/ServiceContainer");

describe("UploadController", () => {
  let app;
  let mockUploadService;

  beforeAll(() => {
    process.env.NODE_ENV = "test";
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock UploadService
    mockUploadService = {
      uploadAndProcess: jest.fn(),
      bulkUploadAndProcess: jest.fn(),
      analyzeExistingFile: jest.fn(),
    };

    // Mock ServiceContainer
    ServiceContainer.mockImplementation(() => ({
      getUploadService: () => mockUploadService,
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

  describe("POST /api/upload/image", () => {
    it("should reject request without file", async () => {
      const response = await request(app)
        .post("/api/upload/image")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("No image file provided");
    });

    it("should upload image successfully", async () => {
      const mockFile = new File({
        id: "file-123",
        filename: "test.jpg",
        mime_type: "image/jpeg",
        file_size: 1024000,
      });

      mockUploadService.uploadAndProcess.mockResolvedValue({
        file: mockFile,
        aiResult: null,
      });

      const response = await request(app)
        .post("/api/upload/image")
        .set("Authorization", "Bearer mock-token")
        .attach("image", Buffer.from("fake-image-data"), "test.jpg");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("uploaded successfully");
      expect(response.body.data).toHaveProperty("id");
      expect(mockUploadService.uploadAndProcess).toHaveBeenCalledWith(
        expect.any(Object),
        "user-123",
        { tagStyle: "neutral", analyzeWithAI: false }
      );
    });

    it("should upload image with custom tagStyle", async () => {
      const mockFile = new File({
        id: "file-123",
        filename: "test.jpg",
      });

      mockUploadService.uploadAndProcess.mockResolvedValue({
        file: mockFile,
        aiResult: null,
      });

      const response = await request(app)
        .post("/api/upload/image")
        .set("Authorization", "Bearer mock-token")
        .field("tagStyle", "descriptive")
        .attach("image", Buffer.from("fake-image-data"), "test.jpg");

      expect(response.status).toBe(200);
      expect(mockUploadService.uploadAndProcess).toHaveBeenCalledWith(
        expect.any(Object),
        "user-123",
        { tagStyle: "descriptive", analyzeWithAI: false }
      );
    });

    it("should handle upload service errors", async () => {
      mockUploadService.uploadAndProcess.mockRejectedValue(
        new Error("Upload failed")
      );

      const response = await request(app)
        .post("/api/upload/image")
        .set("Authorization", "Bearer mock-token")
        .attach("image", Buffer.from("fake-image-data"), "test.jpg");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/upload/upload-and-analyze", () => {
    it("should reject request without file", async () => {
      const response = await request(app)
        .post("/api/upload/upload-and-analyze")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("No image file provided");
    });

    it("should upload and analyze image successfully", async () => {
      const mockFile = new File({
        id: "file-123",
        filename: "test.jpg",
        mime_type: "image/jpeg",
        description: "AI generated description",
        tags: ["ai-tag1", "ai-tag2"],
      });

      mockUploadService.uploadAndProcess.mockResolvedValue({
        file: mockFile,
        aiResult: { success: true },
      });

      const response = await request(app)
        .post("/api/upload/upload-and-analyze")
        .set("Authorization", "Bearer mock-token")
        .attach("image", Buffer.from("fake-image-data"), "test.jpg");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("analyzed successfully");
      expect(response.body.data).toHaveProperty("analysis");
      expect(response.body.data.analysis.success).toBe(true);
      expect(mockUploadService.uploadAndProcess).toHaveBeenCalledWith(
        expect.any(Object),
        "user-123",
        { tagStyle: "neutral", analyzeWithAI: true }
      );
    });

    it("should handle AI analysis failure", async () => {
      const mockFile = new File({
        id: "file-123",
        filename: "test.jpg",
      });

      mockUploadService.uploadAndProcess.mockResolvedValue({
        file: mockFile,
        aiResult: { success: false, error: "AI service unavailable" },
      });

      const response = await request(app)
        .post("/api/upload/upload-and-analyze")
        .set("Authorization", "Bearer mock-token")
        .attach("image", Buffer.from("fake-image-data"), "test.jpg");

      expect(response.status).toBe(200);
      expect(response.body.data.analysis.success).toBe(false);
      expect(response.body.data.analysis.error).toBe("AI service unavailable");
    });

    it("should use custom tagStyle", async () => {
      const mockFile = new File({ id: "file-123" });

      mockUploadService.uploadAndProcess.mockResolvedValue({
        file: mockFile,
        aiResult: { success: true },
      });

      const response = await request(app)
        .post("/api/upload/upload-and-analyze")
        .set("Authorization", "Bearer mock-token")
        .field("tagStyle", "seo-optimized")
        .attach("image", Buffer.from("fake-image-data"), "test.jpg");

      expect(response.status).toBe(200);
      expect(mockUploadService.uploadAndProcess).toHaveBeenCalledWith(
        expect.any(Object),
        "user-123",
        { tagStyle: "seo-optimized", analyzeWithAI: true }
      );
    });
  });

  describe("POST /api/upload/bulk-upload-and-analyze", () => {
    it("should reject request without files", async () => {
      const response = await request(app)
        .post("/api/upload/bulk-upload-and-analyze")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("No image files provided");
    });

    it("should reject more than 10 files", async () => {
      const response = await request(app)
        .post("/api/upload/bulk-upload-and-analyze")
        .set("Authorization", "Bearer mock-token")
        .attach("images", Buffer.from("image1"), "test1.jpg")
        .attach("images", Buffer.from("image2"), "test2.jpg")
        .attach("images", Buffer.from("image3"), "test3.jpg")
        .attach("images", Buffer.from("image4"), "test4.jpg")
        .attach("images", Buffer.from("image5"), "test5.jpg")
        .attach("images", Buffer.from("image6"), "test6.jpg")
        .attach("images", Buffer.from("image7"), "test7.jpg")
        .attach("images", Buffer.from("image8"), "test8.jpg")
        .attach("images", Buffer.from("image9"), "test9.jpg")
        .attach("images", Buffer.from("image10"), "test10.jpg")
        .attach("images", Buffer.from("image11"), "test11.jpg");

      // Multer rejects this at middleware level before controller code runs
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it("should upload and analyze multiple files successfully", async () => {
      const mockFiles = [
        new File({ id: "file-1", filename: "test1.jpg" }),
        new File({ id: "file-2", filename: "test2.jpg" }),
      ];

      mockUploadService.bulkUploadAndProcess.mockResolvedValue({
        results: [
          { file: mockFiles[0], aiResult: { success: true } },
          { file: mockFiles[1], aiResult: { success: true } },
        ],
        errors: [],
      });

      const response = await request(app)
        .post("/api/upload/bulk-upload-and-analyze")
        .set("Authorization", "Bearer mock-token")
        .attach("images", Buffer.from("image1"), "test1.jpg")
        .attach("images", Buffer.from("image2"), "test2.jpg");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.successfulUploads).toBe(2);
      expect(response.body.data.totalAttempts).toBe(2);
      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.errors).toHaveLength(0);
      expect(response.body.data).toHaveProperty("processingTimeSeconds");
    });

    it("should handle partial failures with 207 status", async () => {
      const mockFile = new File({ id: "file-1", filename: "test1.jpg" });

      mockUploadService.bulkUploadAndProcess.mockResolvedValue({
        results: [{ file: mockFile, aiResult: { success: true } }],
        errors: [{ filename: "test2.jpg", error: "Upload failed" }],
      });

      const response = await request(app)
        .post("/api/upload/bulk-upload-and-analyze")
        .set("Authorization", "Bearer mock-token")
        .attach("images", Buffer.from("image1"), "test1.jpg")
        .attach("images", Buffer.from("image2"), "test2.jpg");

      expect(response.status).toBe(207);
      expect(response.body.success).toBe(true);
      expect(response.body.data.successfulUploads).toBe(1);
      expect(response.body.data.totalAttempts).toBe(2);
      expect(response.body.data.errors).toHaveLength(1);
    });

    it("should return 500 if all uploads fail", async () => {
      mockUploadService.bulkUploadAndProcess.mockResolvedValue({
        results: [],
        errors: [
          { filename: "test1.jpg", error: "Failed 1" },
          { filename: "test2.jpg", error: "Failed 2" },
        ],
      });

      const response = await request(app)
        .post("/api/upload/bulk-upload-and-analyze")
        .set("Authorization", "Bearer mock-token")
        .attach("images", Buffer.from("image1"), "test1.jpg")
        .attach("images", Buffer.from("image2"), "test2.jpg");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.data.successfulUploads).toBe(0);
    });

    it("should use custom tagStyle", async () => {
      const mockFile = new File({ id: "file-1" });

      mockUploadService.bulkUploadAndProcess.mockResolvedValue({
        results: [{ file: mockFile, aiResult: { success: true } }],
        errors: [],
      });

      const response = await request(app)
        .post("/api/upload/bulk-upload-and-analyze")
        .set("Authorization", "Bearer mock-token")
        .field("tagStyle", "creative")
        .attach("images", Buffer.from("image1"), "test1.jpg");

      expect(response.status).toBe(200);
      expect(mockUploadService.bulkUploadAndProcess).toHaveBeenCalledWith(
        expect.any(Array),
        "user-123",
        { tagStyle: "creative", analyzeWithAI: true }
      );
    });
  });

  describe("POST /api/upload/analyze/:id", () => {
    it("should analyze existing file successfully", async () => {
      const mockFile = new File({
        id: "file-123",
        filename: "test.jpg",
        description: "New AI description",
        tags: ["new-tag1", "new-tag2"],
        updated_at: new Date().toISOString(),
      });

      mockUploadService.analyzeExistingFile.mockResolvedValue({
        file: mockFile,
        aiResult: { success: true },
      });

      const response = await request(app)
        .post("/api/upload/analyze/file-123")
        .set("Authorization", "Bearer mock-token")
        .send({ tagStyle: "neutral" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("analyzed successfully");
      expect(response.body.data).toHaveProperty("analysis");
      expect(response.body.data.analysis.success).toBe(true);
      expect(mockUploadService.analyzeExistingFile).toHaveBeenCalledWith(
        "file-123",
        "user-123",
        "neutral"
      );
    });

    it("should use default tagStyle if not provided", async () => {
      const mockFile = new File({ id: "file-123", filename: "test.jpg" });

      mockUploadService.analyzeExistingFile.mockResolvedValue({
        file: mockFile,
        aiResult: { success: true },
      });

      const response = await request(app)
        .post("/api/upload/analyze/file-123")
        .set("Authorization", "Bearer mock-token")
        .send({});

      expect(response.status).toBe(200);
      expect(mockUploadService.analyzeExistingFile).toHaveBeenCalledWith(
        "file-123",
        "user-123",
        "neutral"
      );
    });

    it("should use custom tagStyle", async () => {
      const mockFile = new File({ id: "file-123" });

      mockUploadService.analyzeExistingFile.mockResolvedValue({
        file: mockFile,
        aiResult: { success: true },
      });

      const response = await request(app)
        .post("/api/upload/analyze/file-123")
        .set("Authorization", "Bearer mock-token")
        .send({ tagStyle: "professional" });

      expect(response.status).toBe(200);
      expect(mockUploadService.analyzeExistingFile).toHaveBeenCalledWith(
        "file-123",
        "user-123",
        "professional"
      );
    });

    it("should handle analysis errors", async () => {
      mockUploadService.analyzeExistingFile.mockRejectedValue(
        new Error("File not found")
      );

      const response = await request(app)
        .post("/api/upload/analyze/file-123")
        .set("Authorization", "Bearer mock-token")
        .send({ tagStyle: "neutral" });

      expect(response.status).toBe(500);
    });
  });
});
