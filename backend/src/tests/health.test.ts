import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import * as dbModule from "../config/database";

describe("Health API & Application Middleware Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/health", () => {
    it("returns 200 with status 'ok' when database is connected", async () => {
      vi.spyOn(dbModule, "checkDatabaseHealth").mockResolvedValueOnce({
        isConnected: true,
        status: "connected",
        readyState: 1,
        latencyMs: 3,
        error: null,
      });

      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.service).toBe("commitmentpool-api");
      expect(res.body.status).toBe("ok");
      expect(res.body.chainId).toBe(10143);
      expect(res.body.database.connected).toBe(true);
      expect(res.body.database.status).toBe("connected");
      expect(typeof res.body.database.latencyMs).toBe("number");
    });

    it("returns 503 with status 'degraded' when database is disconnected", async () => {
      vi.spyOn(dbModule, "checkDatabaseHealth").mockResolvedValueOnce({
        isConnected: false,
        status: "disconnected",
        readyState: 0,
        latencyMs: null,
        error: "Database is disconnected",
      });

      const res = await request(app).get("/api/health");
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe("degraded");
      expect(res.body.database.connected).toBe(false);
      expect(res.body.database.error).toBe("Database is disconnected");
    });
  });

  describe("GET /health (Legacy Compatibility)", () => {
    it("returns 200 with status 'ok' and Monad chainId", async () => {
      vi.spyOn(dbModule, "checkDatabaseHealth").mockResolvedValueOnce({
        isConnected: true,
        status: "connected",
        readyState: 1,
        latencyMs: 1,
        error: null,
      });

      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.chainId).toBe("10143");
      expect(res.body.database.connected).toBe(true);
    });
  });

  describe("404 and Error Handling", () => {
    it("returns 404 for unknown endpoints", async () => {
      const res = await request(app).get("/api/non-existent-route");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("not_found");
    });
  });
});
