import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { InvalidAuthTokenError } from "@privy-io/node";
import app from "../app";
import { authService } from "../middleware/authenticate";
import UserModel from "../modules/users/user.model";
import * as userService from "../modules/users/user.service";

describe("Privy Server-Side Authentication Middleware & User Profile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("requireAuth Middleware", () => {
    it("rejects request without Authorization header with 401", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("unauthorized");
      expect(res.body.message).toContain("Missing or malformed Authorization header");
    });

    it("rejects non-Bearer authorization scheme with 401", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Basic dXNlcjpwYXNz");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("unauthorized");
    });

    it("rejects empty Bearer token with 401", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer   ");
      expect(res.status).toBe(401);
      expect(res.body.message).toContain("Empty access token provided");
    });

    it("rejects malformed or signature-invalid token with 401", async () => {
      vi.spyOn(authService, "verifyToken").mockRejectedValueOnce(
        new InvalidAuthTokenError("Invalid token signature")
      );

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid.jwt.token");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("invalid_token");
    });

    it("returns token_expired when error message indicates expiration", async () => {
      vi.spyOn(authService, "verifyToken").mockRejectedValueOnce(
        new InvalidAuthTokenError("JWT expired at 1700000000")
      );

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer expired.jwt.token");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("token_expired");
      expect(res.body.message).toContain("expired");
    });

    it("accepts valid token and retrieves authenticated user from /api/auth/me", async () => {
      const mockPrivyUserId = "did:privy:cm1234567890testuser";

      vi.spyOn(authService, "verifyToken").mockResolvedValueOnce({
        user_id: mockPrivyUserId,
        app_id: "test-app-id",
        issued_at: Math.floor(Date.now() / 1000),
        expiration: Math.floor(Date.now() / 1000) + 3600,
      });

      vi.spyOn(userService, "fetchPrivyUser").mockResolvedValueOnce({
        id: mockPrivyUserId,
        linked_accounts: [
          {
            type: "wallet",
            wallet_client_type: "privy",
            chain_type: "ethereum",
            address: "0x71f00000000000000000000000000000000092a4",
          },
          {
            type: "google_oauth",
            email: "alice@example.com",
            name: "Alice Runner",
          },
        ],
      });

      // Mock user in database
      const mockUser = {
        _id: "660000000000000000000001",
        privyUserId: mockPrivyUserId,
        walletAddress: "0x71f00000000000000000000000000000000092a4",
        displayName: "Alice Runner",
        email: "alice@example.com",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(UserModel, "findOne").mockResolvedValueOnce(mockUser as any);
      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValueOnce(mockUser as any);

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer valid.privy.jwt.token");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.privyUserId).toBe(mockPrivyUserId);
      expect(res.body.user.displayName).toBe("Alice Runner");
      expect(res.body.user.walletAddress).toBe("0x71f00000000000000000000000000000000092a4");
    });

    it("supports /api/me alias for backward compatibility", async () => {
      const res = await request(app).get("/api/me");
      expect(res.status).toBe(401);
    });
  });
});
