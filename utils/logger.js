/**
 * Centralized Logging Service
 * Provides structured logging for security events, errors, and operations
 */

class Logger {
  static log(level, category, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...metadata,
    };

    // In production, you'd send this to a logging service (e.g., CloudWatch, Datadog)
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Security event logging
   */
  static security(event, userId, details = {}) {
    this.log("security", "security_event", event, {
      userId,
      severity: "security",
      ...details,
    });
  }

  /**
   * Error logging
   */
  static error(message, error, context = {}) {
    this.log("error", "error", message, {
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      ...context,
    });
  }

  /**
   * Info logging
   */
  static info(message, metadata = {}) {
    this.log("info", "info", message, metadata);
  }

  /**
   * Warning logging
   */
  static warn(message, metadata = {}) {
    this.log("warn", "warning", message, metadata);
  }

  /**
   * Debug logging (only in development)
   */
  static debug(message, metadata = {}) {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", "debug", message, metadata);
    }
  }

  /**
   * Audit logging (user actions)
   */
  static audit(action, userId, details = {}) {
    this.log("audit", "audit_trail", action, {
      userId,
      ...details,
    });
  }

  /**
   * Performance logging
   */
  static performance(operation, duration, metadata = {}) {
    this.log("performance", "performance", operation, {
      durationMs: duration,
      ...metadata,
    });
  }
}

module.exports = Logger;
