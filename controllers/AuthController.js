/**
 * Auth Controller
 * Handles HTTP requests for authentication operations
 */

const { createClient } = require("@supabase/supabase-js");
const {
  asyncHandler,
  ValidationError,
  AuthenticationError,
} = require("../utils/errorHandler");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class AuthController {
  /**
   * POST /api/auth/signup - Register a new user
   */
  static signup = asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    // Validate password strength
    if (password.length < 12) {
      throw new ValidationError("Password must be at least 12 characters long");
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      throw new ValidationError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    }

    // Build user metadata
    const userMetadata = {};
    if (firstName) userMetadata.first_name = firstName.trim();
    if (lastName) userMetadata.last_name = lastName.trim();

    if (firstName || lastName) {
      const nameParts = [];
      if (firstName) nameParts.push(firstName.trim());
      if (lastName) nameParts.push(lastName.trim());
      userMetadata.full_name = nameParts.join(" ");
    }

    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
        emailRedirectTo: `${process.env.FRONTEND_URL}/upload`,
      },
    });

    if (error) {
      throw new ValidationError(error.message);
    }

    // Check if email already exists
    if (
      data.user &&
      !data.session &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      throw new ValidationError(
        "An account with this email already exists. Please login instead."
      );
    }

    const emailConfirmationRequired = !data.user?.confirmed_at;

    res.status(201).json({
      success: true,
      message: emailConfirmationRequired
        ? "User registered successfully. Please check your email to confirm your account."
        : "User registered successfully",
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.user_metadata?.first_name || null,
          lastName: data.user.user_metadata?.last_name || null,
          fullName: data.user.user_metadata?.full_name || null,
          createdAt: data.user.created_at,
          emailConfirmed: !!data.user.confirmed_at,
        },
        session: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
              expiresAt: data.session.expires_at,
            }
          : null,
        emailConfirmationRequired: emailConfirmationRequired,
      },
    });
  });

  /**
   * POST /api/auth/login - Login with email and password
   */
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AuthenticationError(error.message);
    }

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.user_metadata?.first_name || null,
          lastName: data.user.user_metadata?.last_name || null,
          fullName: data.user.user_metadata?.full_name || null,
          avatarUrl: data.user.user_metadata?.avatar_url || null,
          emailConfirmed: !!data.user.confirmed_at,
          createdAt: data.user.created_at,
          lastSignInAt: data.user.last_sign_in_at,
        },
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
          expiresIn: data.session.expires_in,
        },
      },
    });
  });

  /**
   * POST /api/auth/logout - Logout current user
   */
  static logout = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (token) {
      await supabase.auth.signOut();
    }

    res.json({
      success: true,
      message: "Logout successful",
    });
  });

  /**
   * POST /api/auth/refresh - Refresh access token
   */
  static refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new AuthenticationError(error.message);
    }

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
          expiresIn: data.session.expires_in,
        },
      },
    });
  });

  /**
   * POST /api/auth/verify - Verify current token
   */
  static verify = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      throw new ValidationError("No authentication token provided");
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AuthenticationError("Invalid or expired token");
    }

    res.json({
      success: true,
      message: "Token is valid",
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailConfirmed: !!user.confirmed_at,
        },
      },
    });
  });
}

module.exports = AuthController;
