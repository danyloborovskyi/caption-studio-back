/**
 * UserController Tests
 * Tests for user profile management endpoints
 */

const request = require("supertest");

// Mock dependencies
jest.mock("@supabase/supabase-js");
jest.mock("../../middleware/auth");

const { createClient } = require("@supabase/supabase-js");

describe("UserController", () => {
  let app;
  let mockSupabase;
  let mockSupabaseAdmin;
  let mockUserSupabase;
  let mockStorage;

  beforeAll(() => {
    process.env.NODE_ENV = "test";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_KEY = "test-service-role-key";

    // Create persistent mock storage object
    mockStorage = {
      upload: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    // Create persistent mocks with jest.fn() - these will be reused across all tests
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
    };

    mockSupabaseAdmin = {
      auth: {
        admin: {
          updateUserById: jest.fn(),
        },
      },
    };

    mockUserSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      storage: {
        from: jest.fn().mockReturnValue(mockStorage),
      },
    };

    // Mock auth middleware
    const authMock = require("../../middleware/auth");
    authMock.authenticateUser = (req, res, next) => {
      req.user = { id: "user-123", email: "test@example.com" };
      req.token = "mock-token";
      next();
    };

    // Setup createClient to return appropriate mock based on parameters
    // createClient(url, key, options?) - 3 parameters
    createClient.mockImplementation((url, key, options) => {
      // Check if it's admin client (service key as second param)
      if (typeof key === "string" && key.includes("service")) {
        return mockSupabaseAdmin;
      }
      // Check if it's user-specific client (has options object with global headers)
      if (options && typeof options === "object" && options.global) {
        return mockUserSupabase;
      }
      // Default anon client
      return mockSupabase;
    });

    // Load app ONCE with mocks in place
    app = require("../../server");
  });

  beforeEach(() => {
    // Reset mock call history and set default implementations
    jest.clearAllMocks();

    // Set default successful responses for each test
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
          confirmed_at: "2024-01-01",
          user_metadata: {},
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      },
      error: null,
    });

    mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
          user_metadata: {},
          updated_at: "2024-01-01",
        },
      },
      error: null,
    });

    mockUserSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          user_metadata: {},
        },
      },
      error: null,
    });

    mockStorage.upload.mockResolvedValue({
      data: { path: "avatars/user-123/test.jpg" },
      error: null,
    });

    mockStorage.remove.mockResolvedValue({ error: null });

    mockStorage.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://example.com/avatar.jpg" },
    });
  });

  describe("GET /api/user/profile", () => {
    it("should get user profile successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            confirmed_at: "2024-01-01T00:00:00Z",
            phone: "+1234567890",
            user_metadata: {
              first_name: "John",
              last_name: "Doe",
              full_name: "John Doe",
              avatar_url: "https://example.com/avatar.jpg",
            },
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
            last_sign_in_at: "2024-01-03T00:00:00Z",
          },
        },
        error: null,
      });

      const response = await request(app)
        .get("/api/user/profile")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual({
        id: "user-123",
        email: "test@example.com",
        emailConfirmed: true,
        phone: "+1234567890",
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        avatarUrl: "https://example.com/avatar.jpg",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        lastSignInAt: "2024-01-03T00:00:00Z",
      });
    });

    it("should handle user with minimal metadata", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            confirmed_at: null,
            phone: null,
            user_metadata: {},
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
            last_sign_in_at: null,
          },
        },
        error: null,
      });

      const response = await request(app)
        .get("/api/user/profile")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.data.user.emailConfirmed).toBe(false);
      expect(response.body.data.user.firstName).toBeNull();
      expect(response.body.data.user.lastName).toBeNull();
      expect(response.body.data.user.fullName).toBeNull();
      expect(response.body.data.user.avatarUrl).toBeNull();
    });

    it("should reject request without token", async () => {
      const response = await request(app).get("/api/user/profile");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("No authentication token");
    });

    it("should handle invalid token", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      const response = await request(app)
        .get("/api/user/profile")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid or expired token");
    });

    it("should handle expired token", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const response = await request(app)
        .get("/api/user/profile")
        .set("Authorization", "Bearer expired-token");

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/user/update-profile", () => {
    it("should update firstName and lastName successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {
              first_name: "Old",
              last_name: "Name",
            },
          },
        },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: {
              first_name: "John",
              last_name: "Doe",
              full_name: "John Doe",
            },
            updated_at: "2024-01-03T00:00:00Z",
          },
        },
        error: null,
      });

      const response = await request(app)
        .post("/api/user/update-profile")
        .set("Authorization", "Bearer mock-token")
        .send({
          firstName: "John",
          lastName: "Doe",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("updated successfully");
      expect(response.body.data.user.firstName).toBe("John");
      expect(response.body.data.user.lastName).toBe("Doe");
      expect(response.body.data.user.fullName).toBe("John Doe");
    });

    it("should update only firstName", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {
              first_name: "Old",
              last_name: "Doe",
            },
          },
        },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: {
              first_name: "John",
              last_name: "Doe",
              full_name: "John Doe",
            },
            updated_at: "2024-01-03T00:00:00Z",
          },
        },
        error: null,
      });

      const response = await request(app)
        .post("/api/user/update-profile")
        .set("Authorization", "Bearer mock-token")
        .send({ firstName: "John" });

      expect(response.status).toBe(200);
      expect(response.body.data.user.firstName).toBe("John");
    });

    it("should update only lastName", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {
              first_name: "John",
              last_name: "Old",
            },
          },
        },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: {
              first_name: "John",
              last_name: "Smith",
              full_name: "John Smith",
            },
            updated_at: "2024-01-03T00:00:00Z",
          },
        },
        error: null,
      });

      const response = await request(app)
        .post("/api/user/update-profile")
        .set("Authorization", "Bearer mock-token")
        .send({ lastName: "Smith" });

      expect(response.status).toBe(200);
      expect(response.body.data.user.lastName).toBe("Smith");
      expect(response.body.data.user.fullName).toBe("John Smith");
    });

    it("should trim whitespace from names", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { user_metadata: {} } },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: {
              first_name: "John",
              last_name: "Doe",
              full_name: "John Doe",
            },
            updated_at: "2024-01-03T00:00:00Z",
          },
        },
        error: null,
      });

      const response = await request(app)
        .post("/api/user/update-profile")
        .set("Authorization", "Bearer mock-token")
        .send({
          firstName: "  John  ",
          lastName: "  Doe  ",
        });

      expect(response.status).toBe(200);
      expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            first_name: "John",
            last_name: "Doe",
          }),
        })
      );
    });

    it("should handle empty metadata", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { user_metadata: {} } },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: {
              first_name: "John",
              full_name: "John",
            },
            updated_at: "2024-01-03T00:00:00Z",
          },
        },
        error: null,
      });

      const response = await request(app)
        .post("/api/user/update-profile")
        .set("Authorization", "Bearer mock-token")
        .send({ firstName: "John" });

      expect(response.status).toBe(200);
    });

    it("should reject request with no fields to update", async () => {
      const response = await request(app)
        .post("/api/user/update-profile")
        .set("Authorization", "Bearer mock-token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("at least one field");
    });

    it("should handle Supabase update error", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { user_metadata: {} } },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: null,
        error: { message: "Update failed" },
      });

      const response = await request(app)
        .post("/api/user/update-profile")
        .set("Authorization", "Bearer mock-token")
        .send({ firstName: "John" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Update failed");
    });
  });

  describe("POST /api/user/avatar", () => {
    it("should upload avatar successfully", async () => {
      // Mock supabase.auth.getUser (not userSupabase!) - line 159 of controller
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {
              avatar_url: null,
            },
          },
        },
        error: null,
      });

      mockStorage.upload.mockResolvedValueOnce({
        data: { path: "avatars/user-123/file.jpg" },
        error: null,
      });

      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: "https://example.com/avatar.jpg" },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const response = await request(app)
        .post("/api/user/avatar")
        .set("Authorization", "Bearer mock-token")
        .attach("avatar", Buffer.from("fake-image-data"), "avatar.jpg");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("uploaded successfully");
      expect(response.body.data.avatarUrl).toBe(
        "https://example.com/avatar.jpg"
      );
      expect(response.body.data).toHaveProperty("fileSize");
      expect(response.body.data).toHaveProperty("fileSizeMb");
      expect(response.body.data).toHaveProperty("mimeType");
    });

    it("should replace old avatar when uploading new one", async () => {
      // Mock supabase.auth.getUser (not userSupabase!)
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {
              avatar_url:
                "https://example.com/storage/avatars/user-123/old.jpg",
            },
          },
        },
        error: null,
      });

      mockStorage.upload.mockResolvedValueOnce({
        data: { path: "avatars/user-123/new.jpg" },
        error: null,
      });

      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: "https://example.com/new-avatar.jpg" },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const response = await request(app)
        .post("/api/user/avatar")
        .set("Authorization", "Bearer mock-token")
        .attach("avatar", Buffer.from("fake-image-data"), "new-avatar.jpg");

      expect(response.status).toBe(200);
      expect(mockStorage.remove).toHaveBeenCalledWith([
        "avatars/user-123/old.jpg",
      ]);
    });

    it("should reject request without file", async () => {
      const response = await request(app)
        .post("/api/user/avatar")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("image file");
    });

    it("should handle storage upload error", async () => {
      // Mock supabase.auth.getUser (not userSupabase!)
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { user_metadata: {} } },
        error: null,
      });

      mockStorage.upload.mockResolvedValueOnce({
        data: null,
        error: { message: "Upload failed" },
      });

      const response = await request(app)
        .post("/api/user/avatar")
        .set("Authorization", "Bearer mock-token")
        .attach("avatar", Buffer.from("fake-image-data"), "avatar.jpg");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Upload failed");
    });

    it("should handle metadata update error", async () => {
      // Mock supabase.auth.getUser (not userSupabase!)
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { user_metadata: {} } },
        error: null,
      });

      mockStorage.upload.mockResolvedValueOnce({
        data: { path: "avatars/user-123/file.jpg" },
        error: null,
      });

      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: "https://example.com/avatar.jpg" },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: null,
        error: { message: "Metadata update failed" },
      });

      const response = await request(app)
        .post("/api/user/avatar")
        .set("Authorization", "Bearer mock-token")
        .attach("avatar", Buffer.from("fake-image-data"), "avatar.jpg");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Metadata update failed");
    });

    it("should continue if old avatar deletion fails", async () => {
      // Mock supabase.auth.getUser (not userSupabase!)
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {
              avatar_url:
                "https://example.com/storage/avatars/user-123/old.jpg",
            },
          },
        },
        error: null,
      });

      mockStorage.upload.mockResolvedValueOnce({
        data: { path: "avatars/user-123/new.jpg" },
        error: null,
      });

      mockStorage.remove.mockResolvedValueOnce({
        error: { message: "Not found" },
      });

      mockStorage.getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: "https://example.com/new-avatar.jpg" },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const response = await request(app)
        .post("/api/user/avatar")
        .set("Authorization", "Bearer mock-token")
        .attach("avatar", Buffer.from("fake-image-data"), "new-avatar.jpg");

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/user/avatar", () => {
    it("should delete avatar successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {
              avatar_url:
                "https://example.com/storage/avatars/user-123/avatar.jpg",
            },
          },
        },
        error: null,
      });

      mockStorage.remove.mockResolvedValueOnce({ error: null });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const response = await request(app)
        .delete("/api/user/avatar")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("deleted successfully");
      expect(mockStorage.remove).toHaveBeenCalledWith([
        "avatars/user-123/avatar.jpg",
      ]);
    });

    it("should reject when user has no avatar", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {},
          },
        },
        error: null,
      });

      const response = await request(app)
        .delete("/api/user/avatar")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("does not have an avatar");
    });

    it("should handle failed user data retrieval", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "User not found" },
      });

      const response = await request(app)
        .delete("/api/user/avatar")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Failed to get user data");
    });

    it("should handle storage deletion error", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {
              avatar_url:
                "https://example.com/storage/avatars/user-123/avatar.jpg",
            },
          },
        },
        error: null,
      });

      mockStorage.remove.mockResolvedValueOnce({
        error: { message: "Storage deletion failed" },
      });

      const response = await request(app)
        .delete("/api/user/avatar")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Storage deletion failed");
    });

    it("should handle metadata update error after deletion", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {
              avatar_url:
                "https://example.com/storage/avatars/user-123/avatar.jpg",
            },
          },
        },
        error: null,
      });

      mockStorage.remove.mockResolvedValueOnce({ error: null });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValueOnce({
        data: null,
        error: { message: "Metadata update failed" },
      });

      const response = await request(app)
        .delete("/api/user/avatar")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Metadata update failed");
    });
  });
});
