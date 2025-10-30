/**
 * Authentication Integration Tests
 * Tests for auth endpoints with mocked Supabase
 */

const request = require("supertest");

// Mock Supabase before requiring the app
jest.mock("@supabase/supabase-js", () => {
  const mockClient = {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
    },
  };

  return {
    createClient: jest.fn(() => mockClient),
  };
});

const { createClient } = require("@supabase/supabase-js");

describe("Authentication Endpoints", () => {
  let app;
  let mockSupabase;

  beforeAll(() => {
    // Set test environment to prevent rate limiting
    process.env.NODE_ENV = "test";
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Get the mocked Supabase client
    mockSupabase = createClient();

    // Load app after mocking (this reloads the rate limiter too)
    delete require.cache[require.resolve("../../server")];
    app = require("../../server");
  });

  describe("POST /api/auth/signup", () => {
    it("should reject signup with weak password", async () => {
      const response = await request(app).post("/api/auth/signup").send({
        email: "test@example.com",
        password: "weak",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("12 characters");
    });

    it("should reject password without uppercase", async () => {
      const response = await request(app).post("/api/auth/signup").send({
        email: "test@example.com",
        password: "lowercase123!",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("uppercase");
    });

    it("should reject password without special character", async () => {
      const response = await request(app).post("/api/auth/signup").send({
        email: "test@example.com",
        password: "Password123456",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("special character");
    });

    it("should accept valid signup data", async () => {
      // Mock successful signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: {
              first_name: "Test",
              last_name: "User",
            },
          },
          session: {
            access_token: "mock-token",
            refresh_token: "mock-refresh",
          },
        },
        error: null,
      });

      const response = await request(app).post("/api/auth/signup").send({
        email: "test@example.com",
        password: "SecurePass123!",
        firstName: "Test",
        lastName: "User",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("session");
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "SecurePass123!",
        options: {
          data: {
            first_name: "Test",
            last_name: "User",
            full_name: "Test User",
          },
          emailRedirectTo: "http://localhost:3000/upload",
        },
      });
    });

    it("should handle Supabase errors", async () => {
      // Mock Supabase error
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already exists" },
      });

      const response = await request(app).post("/api/auth/signup").send({
        email: "existing@example.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("already exists");
    });

    it("should reject signup with missing email", async () => {
      const response = await request(app).post("/api/auth/signup").send({
        password: "SecurePass123!",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Email and password are required");
    });

    it("should handle existing user with empty identities array", async () => {
      // Mock user already exists scenario (identities array is empty)
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "existing@example.com",
            identities: [], // Empty identities means user exists
          },
          session: null,
        },
        error: null,
      });

      const response = await request(app).post("/api/auth/signup").send({
        email: "existing@example.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain(
        "An account with this email already exists"
      );
    });

    it("should signup without email confirmation (auto-confirmed)", async () => {
      // Mock signup where email is already confirmed
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            confirmed_at: "2025-01-01T00:00:00Z", // Already confirmed
            user_metadata: {},
          },
          session: {
            access_token: "mock-token",
            refresh_token: "mock-refresh",
          },
        },
        error: null,
      });

      const response = await request(app).post("/api/auth/signup").send({
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.data.emailConfirmationRequired).toBe(false);
      expect(response.body.data.user.emailConfirmed).toBe(true);
    });

    it("should handle signup with only firstName", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: {
              first_name: "John",
              full_name: "John",
            },
          },
          session: {
            access_token: "mock-token",
            refresh_token: "mock-refresh",
          },
        },
        error: null,
      });

      const response = await request(app).post("/api/auth/signup").send({
        email: "test@example.com",
        password: "SecurePass123!",
        firstName: "John",
      });

      expect(response.status).toBe(201);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "SecurePass123!",
        options: {
          data: {
            first_name: "John",
            full_name: "John",
          },
          emailRedirectTo: "http://localhost:3000/upload",
        },
      });
    });

    it("should handle signup with only lastName", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: {
              last_name: "Doe",
              full_name: "Doe",
            },
          },
          session: {
            access_token: "mock-token",
            refresh_token: "mock-refresh",
          },
        },
        error: null,
      });

      const response = await request(app).post("/api/auth/signup").send({
        email: "test@example.com",
        password: "SecurePass123!",
        lastName: "Doe",
      });

      expect(response.status).toBe(201);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "SecurePass123!",
        options: {
          data: {
            last_name: "Doe",
            full_name: "Doe",
          },
          emailRedirectTo: "http://localhost:3000/upload",
        },
      });
    });

    it("should handle signup without names", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: {},
          },
          session: {
            access_token: "mock-token",
            refresh_token: "mock-refresh",
          },
        },
        error: null,
      });

      const response = await request(app).post("/api/auth/signup").send({
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(201);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "SecurePass123!",
        options: {
          data: {},
          emailRedirectTo: "http://localhost:3000/upload",
        },
      });
    });
  });

  describe("POST /api/auth/login", () => {
    it("should reject login without credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should handle successful login with full user metadata", async () => {
      // Mock successful login with complete user data
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            confirmed_at: "2025-01-01T00:00:00Z",
            created_at: "2025-01-01T00:00:00Z",
            last_sign_in_at: "2025-01-30T00:00:00Z",
            user_metadata: {
              first_name: "John",
              last_name: "Doe",
              full_name: "John Doe",
              avatar_url: "https://example.com/avatar.jpg",
            },
          },
          session: {
            access_token: "mock-token",
            refresh_token: "mock-refresh",
            expires_at: 1234567890,
            expires_in: 3600,
          },
        },
        error: null,
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual({
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        avatarUrl: "https://example.com/avatar.jpg",
        emailConfirmed: true,
        createdAt: "2025-01-01T00:00:00Z",
        lastSignInAt: "2025-01-30T00:00:00Z",
      });
      expect(response.body.data.session).toEqual({
        accessToken: "mock-token",
        refreshToken: "mock-refresh",
        expiresAt: 1234567890,
        expiresIn: 3600,
      });
    });

    it("should handle invalid credentials", async () => {
      // Mock failed login
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "WrongPass123!",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully with valid token", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logout successful");
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it("should logout successfully without token", async () => {
      const response = await request(app).post("/api/auth/logout");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logout successful");
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    });

    it("should logout with malformed Authorization header", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", "InvalidFormat");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should reject refresh without token", async () => {
      const response = await request(app).post("/api/auth/refresh").send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Refresh token is required");
    });

    it("should refresh token successfully", async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            expires_at: 9876543210,
            expires_in: 7200,
          },
        },
        error: null,
      });

      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "old-refresh-token",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Token refreshed successfully");
      expect(response.body.data.session).toEqual({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: 9876543210,
        expiresIn: 7200,
      });
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: "old-refresh-token",
      });
    });

    it("should handle invalid refresh token", async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid refresh token" },
      });

      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "invalid-token",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Invalid refresh token");
    });

    it("should handle expired refresh token", async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Refresh token expired" },
      });

      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "expired-token",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/verify", () => {
    it("should reject verification without token", async () => {
      const response = await request(app).post("/api/auth/verify");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("No authentication token provided");
    });

    it("should verify valid token successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            confirmed_at: "2025-01-01T00:00:00Z",
          },
        },
        error: null,
      });

      const response = await request(app)
        .post("/api/auth/verify")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Token is valid");
      expect(response.body.data.user).toEqual({
        id: "user-123",
        email: "test@example.com",
        emailConfirmed: true,
      });
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith("valid-token");
    });

    it("should reject invalid token", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid JWT" },
      });

      const response = await request(app)
        .post("/api/auth/verify")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Invalid or expired token");
    });

    it("should reject expired token", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const response = await request(app)
        .post("/api/auth/verify")
        .set("Authorization", "Bearer expired-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Invalid or expired token");
    });

    it("should verify token with unconfirmed email", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-456",
            email: "unconfirmed@example.com",
            confirmed_at: null,
          },
        },
        error: null,
      });

      const response = await request(app)
        .post("/api/auth/verify")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.data.user.emailConfirmed).toBe(false);
    });

    it("should handle malformed Authorization header", async () => {
      const response = await request(app)
        .post("/api/auth/verify")
        .set("Authorization", "InvalidFormat");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("No authentication token provided");
    });
  });
});
