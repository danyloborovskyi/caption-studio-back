/**
 * Centralized Error Handling
 * Provides consistent error responses across the API
 */

class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguishes operational vs programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(400, message, details);
    this.name = "ValidationError";
  }
}

class AuthenticationError extends ApiError {
  constructor(message = "Authentication required") {
    super(401, message);
    this.name = "AuthenticationError";
  }
}

class AuthorizationError extends ApiError {
  constructor(message = "Insufficient permissions") {
    super(403, message);
    this.name = "AuthorizationError";
  }
}

class NotFoundError extends ApiError {
  constructor(resource = "Resource") {
    super(404, `${resource} not found`);
    this.name = "NotFoundError";
  }
}

class ConflictError extends ApiError {
  constructor(message = "Resource conflict") {
    super(409, message);
    this.name = "ConflictError";
  }
}

class RateLimitError extends ApiError {
  constructor(message = "Too many requests") {
    super(429, message);
    this.name = "RateLimitError";
  }
}

class ExternalServiceError extends ApiError {
  constructor(service, message = "External service error") {
    super(503, `${service}: ${message}`);
    this.name = "ExternalServiceError";
    this.service = service;
  }
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log error
  console.error({
    timestamp: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      path: req.path,
      method: req.method,
    },
  });

  // Operational errors (known errors)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
    });
  }

  // Programming errors (unknown errors)
  return res.status(500).json({
    success: false,
    error: "Internal server error",
    ...(process.env.NODE_ENV === "development" && {
      details: err.message,
      stack: err.stack,
    }),
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
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
};
