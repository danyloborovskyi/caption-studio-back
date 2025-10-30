/**
 * FileService Utility Tests
 * Tests for file validation and security functions
 */

const FileService = require("../../utils/fileService");

describe("FileService", () => {
  describe("sanitizeFilename()", () => {
    it("should remove directory paths", () => {
      const result = FileService.sanitizeFilename("../../../etc/passwd");
      expect(result).not.toContain("..");
      expect(result).not.toContain("/");
    });

    it("should replace dangerous characters with underscores", () => {
      const result = FileService.sanitizeFilename('file<>:"|?*.jpg');
      expect(result).toBe("file_______.jpg");
    });

    it("should handle clean filenames", () => {
      const result = FileService.sanitizeFilename("image-photo_2024.jpg");
      expect(result).toBe("image-photo_2024.jpg");
    });

    it("should handle windows paths", () => {
      const result = FileService.sanitizeFilename("C:\\Users\\test\\file.jpg");
      expect(result).toBe("file.jpg");
    });
  });

  describe("validateFileExtension()", () => {
    it("should accept valid image extensions", () => {
      expect(FileService.validateFileExtension("jpg")).toBe(true);
      expect(FileService.validateFileExtension("jpeg")).toBe(true);
      expect(FileService.validateFileExtension("png")).toBe(true);
      expect(FileService.validateFileExtension("gif")).toBe(true);
      expect(FileService.validateFileExtension("webp")).toBe(true);
    });

    it("should handle case-insensitive extensions", () => {
      expect(FileService.validateFileExtension("JPG")).toBe(true);
      expect(FileService.validateFileExtension("PNG")).toBe(true);
    });

    it("should reject invalid extensions", () => {
      expect(FileService.validateFileExtension("exe")).toBe(false);
      expect(FileService.validateFileExtension("php")).toBe(false);
      expect(FileService.validateFileExtension("js")).toBe(false);
      expect(FileService.validateFileExtension("pdf")).toBe(false);
    });
  });

  describe("validateFileSize()", () => {
    it("should accept files under 10MB limit", () => {
      expect(FileService.validateFileSize(1024 * 1024)).toBe(true); // 1MB
      expect(FileService.validateFileSize(5 * 1024 * 1024)).toBe(true); // 5MB
      expect(FileService.validateFileSize(10 * 1024 * 1024)).toBe(true); // 10MB
    });

    it("should reject files over 10MB limit", () => {
      expect(FileService.validateFileSize(11 * 1024 * 1024)).toBe(false); // 11MB
      expect(FileService.validateFileSize(20 * 1024 * 1024)).toBe(false); // 20MB
    });

    it("should handle custom max size", () => {
      expect(FileService.validateFileSize(6 * 1024 * 1024, 5)).toBe(false); // 6MB > 5MB
      expect(FileService.validateFileSize(4 * 1024 * 1024, 5)).toBe(true); // 4MB < 5MB
    });
  });

  describe("generateSecureFilename()", () => {
    it("should generate filename with timestamp and random string", () => {
      const result = FileService.generateSecureFilename("test.jpg", "user-123");

      expect(result).toHaveProperty("filename");
      expect(result).toHaveProperty("path");
      expect(result).toHaveProperty("extension");
      expect(result.extension).toBe("jpg");
      expect(result.filename).toMatch(/^\d+-[A-Za-z0-9]{6}\.jpg$/);
    });

    it("should sanitize input filename", () => {
      const result = FileService.generateSecureFilename(
        "../../../evil.jpg",
        "user-123"
      );

      expect(result.filename).not.toContain("..");
      expect(result.filename).toMatch(/^\d+-[A-Za-z0-9]{6}\.jpg$/);
    });

    it("should include userId in path", () => {
      const userId = "test-user-456";
      const result = FileService.generateSecureFilename("image.png", userId);

      expect(result.path).toContain(userId);
      expect(result.path).toMatch(
        /^images\/test-user-456\/\d+-[A-Za-z0-9]{6}\.png$/
      );
    });

    it("should generate unique filenames", () => {
      const result1 = FileService.generateSecureFilename(
        "test.jpg",
        "user-123"
      );
      const result2 = FileService.generateSecureFilename(
        "test.jpg",
        "user-123"
      );

      expect(result1.filename).not.toBe(result2.filename);
    });
  });

  describe("getFileMetadata()", () => {
    it("should extract file metadata", () => {
      const mockFile = {
        originalname: "test-image.jpg",
        size: 2048000,
        mimetype: "image/jpeg",
        buffer: Buffer.from("test"),
      };

      const metadata = FileService.getFileMetadata(mockFile);

      expect(metadata.originalName).toBe("test-image.jpg");
      expect(metadata.size).toBe(2048000);
      expect(metadata.mimeType).toBe("image/jpeg");
      expect(metadata.buffer).toBeDefined();
    });
  });
});
