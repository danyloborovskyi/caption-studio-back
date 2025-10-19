const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Middleware to verify JWT token from Supabase Auth
 * Adds user object to req.user if authentication is successful
 */
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No authentication token provided",
        message:
          "Please provide a valid Bearer token in the Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
        message: "Please login again",
      });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      email_confirmed: !!user.confirmed_at,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      created_at: user.created_at,
    };

    // Attach the token for further use
    req.token = token;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication failed",
      details: error.message,
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user to req.user if token is valid, but doesn't block the request
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user) {
      // Valid token, attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        email_confirmed: !!user.confirmed_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        created_at: user.created_at,
      };
      req.token = token;
    }

    // Continue regardless of authentication status
    next();
  } catch (error) {
    console.error("Optional auth error:", error);
    // Continue even if there's an error
    next();
  }
};

/**
 * Middleware to check if user's email is confirmed
 * Must be used after authenticateUser middleware
 */
const requireEmailConfirmed = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  if (!req.user.email_confirmed) {
    return res.status(403).json({
      success: false,
      error: "Email confirmation required",
      message:
        "Please confirm your email address before accessing this resource",
    });
  }

  next();
};

/**
 * Middleware to check user roles (if you implement role-based access)
 * Must be used after authenticateUser middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userRole = req.user.app_metadata?.role || "user";

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        message: `This action requires one of the following roles: ${allowedRoles.join(
          ", "
        )}`,
      });
    }

    next();
  };
};

module.exports = {
  authenticateUser,
  optionalAuth,
  requireEmailConfirmed,
  requireRole,
};
