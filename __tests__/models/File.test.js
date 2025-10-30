/**
 * File Model Tests
 * Tests for domain model business logic
 */

const File = require("../../models/File");

describe("File Model", () => {
  describe("constructor", () => {
    it("should create file instance with all properties", () => {
      const fileData = {
        id: "123",
        filename: "test.jpg",
        file_path: "images/user/test.jpg",
        file_size: 1024000,
        mime_type: "image/jpeg",
        public_url: "https://example.com/test.jpg",
        user_id: "user-123",
        status: "completed",
        description: "A test image",
        tags: ["test", "image"],
        uploaded_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const file = new File(fileData);

      expect(file.id).toBe("123");
      expect(file.filename).toBe("test.jpg");
      expect(file.filePath).toBe("images/user/test.jpg");
      expect(file.fileSize).toBe(1024000);
      expect(file.mimeType).toBe("image/jpeg");
    });
  });

  describe("isImage()", () => {
    it("should return true for image mime types", () => {
      const imageFile = new File({ mime_type: "image/jpeg" });
      expect(imageFile.isImage()).toBe(true);
    });

    it("should return false for non-image mime types", () => {
      const pdfFile = new File({ mime_type: "application/pdf" });
      expect(pdfFile.isImage()).toBe(false);
    });

    it("should return false when mime type is undefined", () => {
      const file = new File({});
      expect(file.isImage()).toBe(false);
    });
  });

  describe("hasAIAnalysis()", () => {
    it("should return true when description exists", () => {
      const file = new File({ description: "Test description" });
      expect(file.hasAIAnalysis()).toBe(true);
    });

    it("should return true when tags exist", () => {
      const file = new File({ tags: ["tag1", "tag2"] });
      expect(file.hasAIAnalysis()).toBe(true);
    });

    it("should return false when no description or tags", () => {
      const file = new File({});
      expect(file.hasAIAnalysis()).toBe(false);
    });
  });

  describe("getSizeMB()", () => {
    it("should convert bytes to MB correctly", () => {
      const file = new File({ file_size: 2048000 }); // ~1.95 MB
      expect(file.getSizeMB()).toBe("1.95");
    });

    it("should return null when size is not set", () => {
      const file = new File({});
      expect(file.getSizeMB()).toBe(null);
    });
  });

  describe("status methods", () => {
    it("isProcessing() should return true for processing status", () => {
      const file = new File({ status: "processing" });
      expect(file.isProcessing()).toBe(true);
      expect(file.isCompleted()).toBe(false);
      expect(file.isFailed()).toBe(false);
    });

    it("isCompleted() should return true for completed status", () => {
      const file = new File({ status: "completed" });
      expect(file.isCompleted()).toBe(true);
      expect(file.isProcessing()).toBe(false);
    });

    it("isFailed() should return true for failed status", () => {
      const file = new File({ status: "failed" });
      expect(file.isFailed()).toBe(true);
      expect(file.isCompleted()).toBe(false);
    });
  });

  describe("toJSON()", () => {
    it("should return JSON representation with camelCase keys", () => {
      const file = new File({
        id: "123",
        filename: "test.jpg",
        file_size: 1024000,
        mime_type: "image/jpeg",
        description: "Test",
        tags: ["test"],
      });

      const json = file.toJSON();

      expect(json).toHaveProperty("id");
      expect(json).toHaveProperty("filename");
      expect(json).toHaveProperty("fileSizeMB");
      expect(json).toHaveProperty("hasAIAnalysis");
      expect(json).toHaveProperty("isImage");
      expect(json.hasAIAnalysis).toBe(true);
      expect(json.isImage).toBe(true);
    });
  });
});
