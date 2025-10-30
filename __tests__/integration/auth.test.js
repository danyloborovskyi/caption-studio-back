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

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Get the mocked Supabase client
    mockSupabase = createClient();

    // Load app after mocking
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
  });

  describe("POST /api/auth/login", () => {
    it("should reject login without credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should handle successful login", async () => {
      // Mock successful login
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: "user-123", email: "test@example.com" },
          session: {
            access_token: "mock-token",
            refresh_token: "mock-refresh",
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
      expect(response.body.data).toHaveProperty("session");
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
});
