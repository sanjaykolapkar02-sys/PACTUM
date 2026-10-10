import mongoose from "mongoose";
import { env } from "./env";

export interface DatabaseHealth {
  isConnected: boolean;
  status: "connected" | "connecting" | "disconnecting" | "disconnected";
  readyState: number;
  latencyMs: number | null;
  error: string | null;
}

/**
 * Redacts username and password from a MongoDB connection string for safe logging.
 */
export function sanitizeMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
  } catch {
    return "[redacted-uri]";
  }
}

let isConnecting = false;

/**
 * Establishes a connection to MongoDB using Mongoose.
 */
export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (isConnecting) {
    // Wait until connection state settles
    await new Promise((resolve) => {
      mongoose.connection.once("connected", resolve);
      mongoose.connection.once("error", resolve);
    });
    return mongoose;
  }

  isConnecting = true;
  const safeTarget = sanitizeMongoUri(uri);

  try {
    mongoose.connection.on("connected", () => {
      console.log(`[Database] MongoDB connected successfully to ${safeTarget}`);
    });

    mongoose.connection.on("error", (err) => {
      console.error("[Database] MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[Database] MongoDB disconnected");
    });

    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    return conn;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Database] Failed to connect to MongoDB (${safeTarget}):`, errorMsg);
    throw error;
  } finally {
    isConnecting = false;
  }
}

/**
 * Gracefully disconnects from MongoDB.
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close(false);
      console.log("[Database] MongoDB connection closed gracefully");
    } catch (err) {
      console.error("[Database] Error closing MongoDB connection:", err instanceof Error ? err.message : err);
    }
  }
}

/**
 * Verifies actual MongoDB connectivity by pinging the database admin command.
 * Only reports connected if ping succeeds.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const readyState = mongoose.connection.readyState;

  const stateNames: Record<number, DatabaseHealth["status"]> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const status = stateNames[readyState] || "disconnected";

  if (readyState !== 1 || !mongoose.connection.db) {
    return {
      isConnected: false,
      status,
      readyState,
      latencyMs: null,
      error: readyState === 2 ? "Database is currently connecting" : "Database is disconnected",
    };
  }

  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const latencyMs = Date.now() - start;

    return {
      isConnected: true,
      status: "connected",
      readyState: 1,
      latencyMs,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ping failed";
    return {
      isConnected: false,
      status: "disconnected",
      readyState,
      latencyMs: null,
      error: `Database ping failed: ${msg}`,
    };
  }
}
