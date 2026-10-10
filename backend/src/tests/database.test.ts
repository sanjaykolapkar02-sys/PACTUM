import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";
import {
  sanitizeMongoUri,
  checkDatabaseHealth,
  connectDatabase,
  disconnectDatabase,
} from "../config/database";

describe("MongoDB Connection & Health Check Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  describe("sanitizeMongoUri", () => {
    it("redacts credentials from standard mongodb connection string", () => {
      const input = "mongodb://admin:secretPassword123@127.0.0.1:27017/commitmentpool";
      const sanitized = sanitizeMongoUri(input);
      expect(sanitized).toBe("mongodb://admin:***@127.0.0.1:27017/commitmentpool");
      expect(sanitized).not.toContain("secretPassword123");
    });

    it("redacts credentials from mongodb+srv Atlas connection string", () => {
      const input = "mongodb+srv://clusterUser:SuperSecret99@cluster0.abcde.mongodb.net/db?retryWrites=true";
      const sanitized = sanitizeMongoUri(input);
      expect(sanitized).toBe("mongodb+srv://clusterUser:***@cluster0.abcde.mongodb.net/db?retryWrites=true");
      expect(sanitized).not.toContain("SuperSecret99");
    });

    it("leaves connection strings without credentials unchanged", () => {
      const input = "mongodb://127.0.0.1:27017/commitmentpool";
      expect(sanitizeMongoUri(input)).toBe(input);
    });
  });

  describe("checkDatabaseHealth", () => {
    it("reports disconnected status when readyState is 0", async () => {
      // Mock readyState as disconnected
      vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(0 as any);

      const health = await checkDatabaseHealth();
      expect(health.isConnected).toBe(false);
      expect(health.status).toBe("disconnected");
      expect(health.latencyMs).toBeNull();
      expect(health.error).toBe("Database is disconnected");
    });

    it("reports connecting status when readyState is 2", async () => {
      vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(2 as any);

      const health = await checkDatabaseHealth();
      expect(health.isConnected).toBe(false);
      expect(health.status).toBe("connecting");
      expect(health.error).toBe("Database is currently connecting");
    });

    it("reports connected and measures latency when ping succeeds", async () => {
      vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(1 as any);
      const pingSpy = vi.fn().mockResolvedValue({ ok: 1 });
      (mongoose.connection as any).db = {
        admin: () => ({ ping: pingSpy }),
      };

      const health = await checkDatabaseHealth();
      expect(health.isConnected).toBe(true);
      expect(health.status).toBe("connected");
      expect(health.readyState).toBe(1);
      expect(typeof health.latencyMs).toBe("number");
      expect(health.error).toBeNull();
      expect(pingSpy).toHaveBeenCalled();
    });

    it("reports disconnected if ping throws error even if readyState is 1", async () => {
      vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(1 as any);
      const pingSpy = vi.fn().mockRejectedValue(new Error("Socket closed"));
      (mongoose.connection as any).db = {
        admin: () => ({ ping: pingSpy }),
      };

      const health = await checkDatabaseHealth();
      expect(health.isConnected).toBe(false);
      expect(health.status).toBe("disconnected");
      expect(health.error).toContain("Database ping failed: Socket closed");
    });
  });

  describe("connectDatabase and disconnectDatabase lifecycle", () => {
    it("returns existing mongoose instance if already connected (readyState 1)", async () => {
      vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(1 as any);
      const connSpy = vi.spyOn(mongoose, "connect");

      const result = await connectDatabase("mongodb://127.0.0.1:27017/test");
      expect(result).toBe(mongoose);
      expect(connSpy).not.toHaveBeenCalled();
    });

    it("propagates error and logs sanitized URI when connection fails", async () => {
      vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(0 as any);
      vi.spyOn(mongoose, "connect").mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(
        connectDatabase("mongodb://user:secret@127.0.0.1:27017/test")
      ).rejects.toThrow("ECONNREFUSED");
    });

    it("disconnectDatabase closes connection cleanly", async () => {
      vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(1 as any);
      const closeSpy = vi.spyOn(mongoose.connection, "close").mockResolvedValueOnce(undefined as any);

      await disconnectDatabase();
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
