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

  // Helper function to reconfigure createClient with local mocks and reload modules
  const reconfigureCreateClient = (
    localSupabase,
    localAdmin,
    localUserSupabase
  ) => {
    createClient.mockImplementation((url, keyOrOptions) => {
      if (
        typeof keyOrOptions === "string" &&
        keyOrOptions.includes("service")
      ) {
        return localAdmin || mockSupabaseAdmin;
      }
      if (typeof keyOrOptions === "object" && keyOrOptions.global) {
        return localUserSupabase || mockUserSupabase;
      }
      return localSupabase || mockSupabase;
    });

    // Clear UserController from cache so it re-initializes with new mocks
    delete require.cache[require.resolve("../../controllers/UserController")];
    // Reload server to use the new UserController
    delete require.cache[require.resolve("../../server")];
    app = require("../../server");
  };

  beforeAll(() => {
    process.env.NODE_ENV = "test";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_KEY = "test-service-role-key";
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase clients with default SUCCESS implementations
    // Individual tests will override these for error scenarios
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
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
        }),
      },
    };

    mockSupabaseAdmin = {
      auth: {
        admin: {
          updateUserById: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: "user-123",
                email: "test@example.com",
                user_metadata: {},
                updated_at: "2024-01-01",
              },
            },
            error: null,
          }),
        },
      },
    };

    mockUserSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-123",
              user_metadata: {},
            },
          },
          error: null,
        }),
      },
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: "avatars/user-123/test.jpg" },
            error: null,
          }),
          remove: jest.fn().mockResolvedValue({ error: null }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: "https://example.com/avatar.jpg" },
          }),
        }),
      },
    };

    // Mock auth middleware FIRST (before loading server)
    const authMock = require("../../middleware/auth");
    authMock.authenticateUser = (req, res, next) => {
      req.user = { id: "user-123", email: "test@example.com" };
      req.token = "mock-token";
      next();
    };

    // Setup createClient BEFORE loading server (critical for module-level initialization)
    createClient.mockImplementation((url, keyOrOptions) => {
      // Check if it's admin client (service key)
      if (
        typeof keyOrOptions === "string" &&
        keyOrOptions.includes("service")
      ) {
        return mockSupabaseAdmin;
      }
      // Check if it's user-specific client (has options object with headers)
      if (typeof keyOrOptions === "object" && keyOrOptions.global) {
        return mockUserSupabase;
      }
      // Default anon client
      return mockSupabase;
    });

    // Clear UserController from cache so it re-initializes with our mocks
    delete require.cache[require.resolve("../../controllers/UserController")];

    // Load app
    delete require.cache[require.resolve("../../server")];
    app = require("../../server");
  });

  describe("GET /api/user/profile", () => {
    it("should get user profile successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
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
      // Override the default mock for this specific test
      const localMockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                id: "user-123",
                email: "test@example.com",
                confirmed_at: null, // null = not confirmed
                phone: null,
                user_metadata: {},
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-02T00:00:00Z",
                last_sign_in_at: null,
              },
            },
            error: null,
          }),
        },
      };

      createClient.mockImplementation((url, keyOrOptions) => {
        if (
          typeof keyOrOptions === "string" &&
          keyOrOptions.includes("service")
        ) {
          return mockSupabaseAdmin;
        }
        if (typeof keyOrOptions === "object" && keyOrOptions.global) {
          return mockUserSupabase;
        }
        return localMockSupabase; // Use local mock instead
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
      const localMockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "Invalid token" },
          }),
        },
      };

      createClient.mockImplementation((url, keyOrOptions) => {
        if (
          typeof keyOrOptions === "string" &&
          keyOrOptions.includes("service")
        ) {
          return mockSupabaseAdmin;
        }
        if (typeof keyOrOptions === "object" && keyOrOptions.global) {
          return mockUserSupabase;
        }
        return localMockSupabase;
      });

      const response = await request(app)
        .get("/api/user/profile")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid or expired token");
    });

    it("should handle expired token", async () => {
      const localMockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      createClient.mockImplementation((url, keyOrOptions) => {
        if (
          typeof keyOrOptions === "string" &&
          keyOrOptions.includes("service")
        ) {
          return mockSupabaseAdmin;
        }
        if (typeof keyOrOptions === "object" && keyOrOptions.global) {
          return mockUserSupabase;
        }
        return localMockSupabase;
      });

      const response = await request(app)
        .get("/api/user/profile")
        .set("Authorization", "Bearer expired-token");

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/user/update-profile", () => {
    it("should update firstName and lastName successfully", async () => {
      const localMockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                user_metadata: {
                  first_name: "Old",
                  last_name: "Name",
                },
              },
            },
          }),
        },
      };

      const localMockAdmin = {
        auth: {
          admin: {
            updateUserById: jest.fn().mockResolvedValue({
              data: {
                user: {
                  id: "user-123",
                  email: "test@example.com",
                  user_metadata: {
                    first_name: "John",
                    last_name: "Doe",
                    full_name: "John Doe",
                    avatar_url: "https://example.com/avatar.jpg",
                  },
                  updated_at: "2024-01-03T00:00:00Z",
                },
              },
              error: null,
            }),
          },
        },
      };

      createClient.mockImplementation((url, keyOrOptions) => {
        if (
          typeof keyOrOptions === "string" &&
          keyOrOptions.includes("service")
        ) {
          return localMockAdmin;
        }
        if (typeof keyOrOptions === "object" && keyOrOptions.global) {
          return mockUserSupabase;
        }
        return localMockSupabase;
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
      const localSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                user_metadata: {
                  first_name: "Old",
                  last_name: "Doe",
                },
              },
            },
          }),
        },
      };

      const localAdmin = {
        auth: {
          admin: {
            updateUserById: jest.fn().mockResolvedValue({
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
            }),
          },
        },
      };

      reconfigureCreateClient(localSupabase, localAdmin);

      const response = await request(app)
        .post("/api/user/update-profile")
        .set("Authorization", "Bearer mock-token")
        .send({ firstName: "John" });

      expect(response.status).toBe(200);
      expect(response.body.data.user.firstName).toBe("John");
    });

    it("should update only lastName", async () => {
      const localSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: {
              user: {
                user_metadata: {
                  first_name: "John",
                  last_name: "Old",
                },
              },
            },
          }),
        },
      };

      const localAdmin = {
        auth: {
          admin: {
            updateUserById: jest.fn().mockResolvedValue({
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
            }),
          },
        },
      };

      reconfigureCreateClient(localSupabase, localAdmin);

      const response = await request(app)
        .post("/api/user/update-profile")
        .set("Authorization", "Bearer mock-token")
        .send({ lastName: "Smith" });

      expect(response.status).toBe(200);
      expect(response.body.data.user.lastName).toBe("Smith");
      expect(response.body.data.user.fullName).toBe("John Smith");
    });

    it("should trim whitespace from names", async () => {
      const localSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { user_metadata: {} } },
          }),
        },
      };

      const localAdmin = {
        auth: {
          admin: {
            updateUserById: jest.fn().mockResolvedValue({
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
            }),
          },
        },
      };

      reconfigureCreateClient(localSupabase, localAdmin);

      const response = await request(app)
        .post("/api/user/update-profile")
        .set("Authorization", "Bearer mock-token")
        .send({
          firstName: "  John  ",
          lastName: "  Doe  ",
        });

      expect(response.status).toBe(200);
      expect(localAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
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
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { user_metadata: {} } },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
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
      const localSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { user_metadata: {} } },
          }),
        },
      };

      const localAdmin = {
        auth: {
          admin: {
            updateUserById: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Update failed" },
            }),
          },
        },
      };

      reconfigureCreateClient(localSupabase, localAdmin);

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
      const mockStorage = {
        upload: jest.fn().mockResolvedValue({
          data: { path: "avatars/user-123/file.jpg" },
          error: null,
        }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://example.com/avatar.jpg" },
        }),
      };

      mockUserSupabase.storage.from.mockReturnValue(mockStorage);
      mockUserSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            user_metadata: {
              avatar_url: null,
            },
          },
        },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
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
      const mockStorage = {
        upload: jest.fn().mockResolvedValue({
          data: { path: "avatars/user-123/new.jpg" },
          error: null,
        }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://example.com/new-avatar.jpg" },
        }),
      };

      mockUserSupabase.storage.from.mockReturnValue(mockStorage);
      mockUserSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            user_metadata: {
              avatar_url:
                "https://example.com/storage/avatars/user-123/old.jpg",
            },
          },
        },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
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
      const mockStorage = {
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Upload failed" },
        }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn(),
      };

      mockUserSupabase.storage.from.mockReturnValue(mockStorage);
      mockUserSupabase.auth.getUser.mockResolvedValue({
        data: { user: { user_metadata: {} } },
      });

      const response = await request(app)
        .post("/api/user/avatar")
        .set("Authorization", "Bearer mock-token")
        .attach("avatar", Buffer.from("fake-image-data"), "avatar.jpg");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Upload failed");
    });

    it("should handle metadata update error", async () => {
      const mockStorage = {
        upload: jest.fn().mockResolvedValue({
          data: { path: "avatars/user-123/file.jpg" },
          error: null,
        }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://example.com/avatar.jpg" },
        }),
      };

      mockUserSupabase.storage.from.mockReturnValue(mockStorage);
      mockUserSupabase.auth.getUser.mockResolvedValue({
        data: { user: { user_metadata: {} } },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
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
      const mockStorage = {
        upload: jest.fn().mockResolvedValue({
          data: { path: "avatars/user-123/new.jpg" },
          error: null,
        }),
        remove: jest
          .fn()
          .mockResolvedValue({ error: { message: "Not found" } }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://example.com/new-avatar.jpg" },
        }),
      };

      mockUserSupabase.storage.from.mockReturnValue(mockStorage);
      mockUserSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            user_metadata: {
              avatar_url:
                "https://example.com/storage/avatars/user-123/old.jpg",
            },
          },
        },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const response = await request(app)
        .post("/api/user/avatar")
        .set("Authorization", "Bearer mock-token")
        .attach("avatar", Buffer.from("fake-image-data"), "new-avatar.jpg");

      // Should still succeed even if old avatar deletion failed
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/user/avatar", () => {
    it("should delete avatar successfully", async () => {
      const mockStorage = {
        remove: jest.fn().mockResolvedValue({ error: null }),
      };

      mockUserSupabase.storage.from.mockReturnValue(mockStorage);

      mockSupabase.auth.getUser.mockResolvedValue({
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

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
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
      mockSupabase.auth.getUser.mockResolvedValue({
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
      const mockStorage = {
        remove: jest.fn().mockResolvedValue({
          error: { message: "Storage deletion failed" },
        }),
      };

      mockUserSupabase.storage.from.mockReturnValue(mockStorage);

      mockSupabase.auth.getUser.mockResolvedValue({
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

      const response = await request(app)
        .delete("/api/user/avatar")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Storage deletion failed");
    });

    it("should handle metadata update error after deletion", async () => {
      const mockStorage = {
        remove: jest.fn().mockResolvedValue({ error: null }),
      };

      mockUserSupabase.storage.from.mockReturnValue(mockStorage);

      mockSupabase.auth.getUser.mockResolvedValue({
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

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
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
