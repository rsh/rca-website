/**
 * Tests for API client
 */

import { ApiClient } from "../api/client";

// Mock fetch globally
global.fetch = jest.fn();

describe("ApiClient", () => {
  let client: ApiClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    localStorage.clear();
    client = new ApiClient("http://test-api.com");
  });

  describe("Token management", () => {
    it("loads token from localStorage", () => {
      localStorage.setItem("auth_token", "stored-token");
      const newClient = new ApiClient();
      expect(newClient.getToken()).toBe("stored-token");
    });

    it("returns null when no token is stored", () => {
      expect(client.getToken()).toBeNull();
    });

    it("clears token from localStorage", () => {
      localStorage.setItem("auth_token", "test-token");
      const newClient = new ApiClient();
      newClient.clearToken();
      expect(newClient.getToken()).toBeNull();
      expect(localStorage.getItem("auth_token")).toBeNull();
    });

    it("checks authentication status", () => {
      expect(client.isAuthenticated()).toBe(false);
      localStorage.setItem("auth_token", "test-token");
      const authenticatedClient = new ApiClient();
      expect(authenticatedClient.isAuthenticated()).toBe(true);
    });
  });

  describe("register", () => {
    it("registers a new user and saves token", async () => {
      const mockResponse = {
        token: "new-token",
        user: { id: 1, username: "testuser", email: "test@example.com" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.register({
        email: "test@example.com",
        username: "testuser",
        password: "password123",
      });

      expect(result.token).toBe("new-token");
      expect(client.getToken()).toBe("new-token");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/auth/register",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
            username: "testuser",
            password: "password123",
          }),
        })
      );
    });

    it("throws error on registration failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Email already registered" }),
      } as Response);

      await expect(
        client.register({
          email: "test@example.com",
          username: "testuser",
          password: "password123",
        })
      ).rejects.toThrow("Email already registered");
    });
  });

  describe("login", () => {
    it("logs in a user and saves token", async () => {
      const mockResponse = {
        token: "login-token",
        user: { id: 1, username: "testuser", email: "test@example.com" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.token).toBe("login-token");
      expect(client.getToken()).toBe("login-token");
    });

    it("throws error on login failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid credentials" }),
      } as Response);

      await expect(
        client.login({
          email: "test@example.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("logout", () => {
    it("clears token", () => {
      localStorage.setItem("auth_token", "test-token");
      const authenticatedClient = new ApiClient();
      authenticatedClient.logout();
      expect(authenticatedClient.getToken()).toBeNull();
    });
  });

  describe("getCurrentUser", () => {
    it("gets current user profile", async () => {
      const mockUser = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        created_at: "2024-01-01",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      } as Response);

      const result = await client.getCurrentUser();
      expect(result).toEqual(mockUser);
    });
  });

  describe("getRcas", () => {
    it("gets all RCAs", async () => {
      const mockRcas = [
        { id: 1, name: "Outage RCA", description: "Prod down" },
        { id: 2, name: "Bug RCA", description: null },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rcas: mockRcas }),
      } as Response);

      const result = await client.getRcas();
      expect(result).toEqual(mockRcas);
    });
  });

  describe("createRca", () => {
    it("creates a new RCA", async () => {
      const mockRca = { id: 1, name: "New RCA", description: "Desc" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rca: mockRca }),
      } as Response);

      const result = await client.createRca({
        name: "New RCA",
        description: "Desc",
      });

      expect(result).toEqual(mockRca);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/rcas",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  describe("getRca", () => {
    it("gets a specific RCA", async () => {
      const mockRca = {
        id: 1,
        name: "RCA 1",
        description: "Desc",
        nodes: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rca: mockRca }),
      } as Response);

      const result = await client.getRca(1);
      expect(result).toEqual(mockRca);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/rcas/1",
        expect.any(Object)
      );
    });
  });

  describe("updateRca", () => {
    it("updates an RCA", async () => {
      const mockRca = {
        id: 1,
        name: "Updated RCA",
        description: "Updated",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rca: mockRca }),
      } as Response);

      const result = await client.updateRca(1, { name: "Updated RCA" });

      expect(result).toEqual(mockRca);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/rcas/1",
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });
  });

  describe("deleteRca", () => {
    it("deletes an RCA", async () => {
      const mockResponse = { message: "RCA deleted successfully" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.deleteRca(1);
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/rcas/1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("createNode", () => {
    it("creates a why node", async () => {
      const mockNode = {
        id: 1,
        rca_id: 1,
        parent_id: null,
        node_type: "why",
        content: "Server crashed",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ node: mockNode }),
      } as Response);

      const result = await client.createNode(1, {
        node_type: "why",
        content: "Server crashed",
      });

      expect(result).toEqual(mockNode);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/rcas/1/nodes",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  describe("updateNode", () => {
    it("updates a node", async () => {
      const mockNode = {
        id: 1,
        content: "Updated content",
        node_type: "why",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ node: mockNode }),
      } as Response);

      const result = await client.updateNode(1, { content: "Updated content" });

      expect(result).toEqual(mockNode);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/nodes/1",
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });
  });

  describe("deleteNode", () => {
    it("deletes a node", async () => {
      const mockResponse = { message: "Node deleted successfully" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.deleteNode(1);
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/nodes/1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("Authentication headers", () => {
    it("includes Authorization header when token is present", async () => {
      localStorage.setItem("auth_token", "test-token");
      const authenticatedClient = new ApiClient("http://test-api.com");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rcas: [] }),
      } as Response);

      await authenticatedClient.getRcas();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/rcas",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("does not include Authorization header when no token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rcas: [] }),
      } as Response);

      await client.getRcas();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/rcas",
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });
  });
});
