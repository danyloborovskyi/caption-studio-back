/**
 * Error Handler Tests
 * Tests for custom error classes and error handling middleware
 */

const {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  errorHandler,
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

    it("should use default message if none provided", () => {
      const error = new ExternalServiceError("Supabase");

      expect(error.message).toBe("Supabase: External service error");
    });
  });

  describe("ConflictError", () => {
    it("should create conflict error with 409 status", () => {
      const error = new ConflictError("Resource already exists");

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Resource already exists");
      expect(error.name).toBe("ConflictError");
    });

    it("should use default message if none provided", () => {
      const error = new ConflictError();

      expect(error.message).toBe("Resource conflict");
    });
  });

  describe("RateLimitError", () => {
    it("should create rate limit error with 429 status", () => {
      const error = new RateLimitError("Too many login attempts");

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe("Too many login attempts");
      expect(error.name).toBe("RateLimitError");
    });

    it("should use default message if none provided", () => {
      const error = new RateLimitError();

      expect(error.message).toBe("Too many requests");
    });
  });

  describe("ApiError (base class)", () => {
    it("should create base error with all properties", () => {
      const error = new ApiError(418, "I'm a teapot", { reason: "test" });

      expect(error.statusCode).toBe(418);
      expect(error.message).toBe("I'm a teapot");
      expect(error.details).toEqual({ reason: "test" });
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it("should work without details", () => {
      const error = new ApiError(500, "Server error");

      expect(error.details).toBeNull();
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

  it("should handle promise rejections", async () => {
    const mockNext = jest.fn();
    const mockReq = {};
    const mockRes = {};

    const asyncFunction = asyncHandler(async (req, res, next) => {
      throw new Error("Promise rejection");
    });

    await asyncFunction(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockNext.mock.calls[0][0].message).toBe("Promise rejection");
  });
});

describe("errorHandler middleware", () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let consoleErrorSpy;

  beforeEach(() => {
    mockReq = {
      path: "/api/test",
      method: "POST",
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Suppress console.error during tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Operational Errors", () => {
    it("should handle ValidationError correctly", () => {
      const error = new ValidationError("Invalid email", { field: "email" });

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Invalid email",
        details: { field: "email" },
      });
    });

    it("should handle AuthenticationError correctly", () => {
      const error = new AuthenticationError("Token expired");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Token expired",
        details: null,
      });
    });

    it("should handle AuthorizationError correctly", () => {
      const error = new AuthorizationError("Access denied");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Access denied",
        details: null,
      });
    });

    it("should handle NotFoundError correctly", () => {
      const error = new NotFoundError("File");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "File not found",
        details: null,
      });
    });

    it("should handle ConflictError correctly", () => {
      const error = new ConflictError("Email already exists");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Email already exists",
        details: null,
      });
    });

    it("should handle RateLimitError correctly", () => {
      const error = new RateLimitError("Too many attempts");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Too many attempts",
        details: null,
      });
    });

    it("should handle ExternalServiceError correctly", () => {
      const error = new ExternalServiceError("OpenAI", "API timeout");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "OpenAI: API timeout",
        details: null,
      });
    });
  });

  describe("Non-Operational Errors (Programming Errors)", () => {
    it("should handle generic Error as internal server error in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Something went wrong");
      error.isOperational = false;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal server error",
      });

      process.env.NODE_ENV = originalEnv;
    });

    it("should include error details in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new Error("Something went wrong");
      error.isOperational = false;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal server error",
        details: "Something went wrong",
        stack: expect.any(String),
      });

      process.env.NODE_ENV = originalEnv;
    });

    it("should handle errors without isOperational property in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Unexpected error");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal server error",
      });

      process.env.NODE_ENV = originalEnv;
    });

    it("should handle errors without isOperational property in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new Error("Unexpected error");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal server error",
        details: "Unexpected error",
        stack: expect.any(String),
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Logging", () => {
    it("should log error with timestamp and request info", () => {
      const error = new ValidationError("Test error");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          error: expect.objectContaining({
            name: "ValidationError",
            message: "Test error",
            statusCode: 400,
            path: "/api/test",
            method: "POST",
          }),
        })
      );
    });

    it("should include stack trace in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new ValidationError("Test error");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String),
          }),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should not include stack trace in production mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new ValidationError("Test error");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: undefined,
          }),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Error Details", () => {
    it("should include error details when provided", () => {
      const error = new ValidationError("Validation failed", {
        fields: ["email", "password"],
        reasons: ["Invalid format", "Too short"],
      });

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Validation failed",
        details: {
          fields: ["email", "password"],
          reasons: ["Invalid format", "Too short"],
        },
      });
    });

    it("should handle null details", () => {
      const error = new ValidationError("Error without details");

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Error without details",
        details: null,
      });
    });
  });
});
