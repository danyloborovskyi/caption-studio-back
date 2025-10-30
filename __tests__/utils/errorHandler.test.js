/**
 * Error Handler Tests
 * Tests for custom error classes and error handling middleware
 */

const {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ExternalServiceError,
  asyncHandler,
} = require("../../utils/errorHandler");

describe("Error Classes", () => {
  describe("ValidationError", () => {
    it("should create validation error with correct properties", () => {
      const error = new ValidationError("Invalid input", { field: "email" });

      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: "email" });
      expect(error.name).toBe("ValidationError");
      expect(error.isOperational).toBe(true);
    });
  });

  describe("AuthenticationError", () => {
    it("should create authentication error with 401 status", () => {
      const error = new AuthenticationError("Invalid token");

      expect(error.message).toBe("Invalid token");
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe("AuthenticationError");
    });

    it("should use default message if none provided", () => {
      const error = new AuthenticationError();

      expect(error.message).toBe("Authentication required");
    });
  });

  describe("AuthorizationError", () => {
    it("should create authorization error with 403 status", () => {
      const error = new AuthorizationError("Access denied");

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Access denied");
    });
  });

  describe("NotFoundError", () => {
    it("should create not found error with resource name", () => {
      const error = new NotFoundError("User");

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("User not found");
    });
  });

  describe("ExternalServiceError", () => {
    it("should create external service error with service name", () => {
      const error = new ExternalServiceError("OpenAI", "API timeout");

      expect(error.statusCode).toBe(503);
      expect(error.message).toBe("OpenAI: API timeout");
      expect(error.service).toBe("OpenAI");
    });
  });
});

describe("asyncHandler", () => {
  it("should wrap async function and catch errors", async () => {
    const mockNext = jest.fn();
    const mockReq = {};
    const mockRes = {};

    const asyncFunction = asyncHandler(async (req, res, next) => {
      throw new Error("Test error");
    });

    await asyncFunction(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe("Test error");
  });

  it("should not catch errors if function succeeds", async () => {
    const mockNext = jest.fn();
    const mockReq = {};
    const mockRes = { json: jest.fn() };

    const asyncFunction = asyncHandler(async (req, res, next) => {
      res.json({ success: true });
    });

    await asyncFunction(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
  });
});
