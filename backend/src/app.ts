import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { monadConfig } from "./config/monad";
import { connectDatabase, checkDatabaseHealth } from "./config/database";
import { notFoundHandler } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { asyncHandler } from "./utils/asyncHandler";

// Route modules
import userRoutes from "./modules/users/user.routes";
import challengeRoutes from "./modules/challenges/challenge.routes";
import {
  challengeSubmissionsRouter,
  submissionVotesRouter,
} from "./modules/submissions/submission.routes";

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8000",
  "http://localhost:3000",
  "https://*.vercel.app",
];

const configuredOrigins = (env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

/**
 * Checks whether an incoming request Origin is permitted by FRONTEND_ORIGIN.
 * Supports exact matches and wildcard subdomain patterns (e.g., https://*.vercel.app).
 * Never permits '*' wildcard with credentials.
 */
function isOriginAllowed(origin: string, allowedList: string[]): boolean {
  const normalizedOrigin = origin.replace(/\/+$/, "").toLowerCase();

  return allowedList.some((allowed) => {
    const normalizedAllowed = allowed.replace(/\/+$/, "").toLowerCase();
    if (normalizedAllowed === normalizedOrigin) {
      return true;
    }
    // Support wildcard subdomain matching (e.g., https://*.vercel.app or *.vercel.app)
    if (normalizedAllowed.includes("*")) {
      const regexPattern =
        "^" +
        normalizedAllowed
          .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, "[a-zA-Z0-9_.-]+") +
        "$";
      return new RegExp(regexPattern).test(normalizedOrigin);
    }
    return false;
  });
}

// Security Headers
app.use(helmet());

// CORS configuration (no wildcard with credentials)
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body Parsing
app.use(express.json({ limit: "1mb" }));

// Serverless / Hosted database connection assurance middleware
app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

// Safe request logging (no credentials or bearer tokens logged)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (env.NODE_ENV !== "test") {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Primary Health Check Endpoint: GET /api/health
app.get(
  "/api/health",
  asyncHandler(async (_req, res) => {
    const dbHealth = await checkDatabaseHealth();

    const isHealthy = dbHealth.isConnected;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      success: isHealthy,
      service: "commitmentpool-api",
      status: isHealthy ? "ok" : "degraded",
      chainId: monadConfig.chainId,
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealth.isConnected,
        status: dbHealth.status,
        latencyMs: dbHealth.latencyMs,
        error: dbHealth.error,
      },
    });
  })
);

// Backward-compatible Health Endpoint: GET /health (used by legacy test scripts)
app.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const dbHealth = await checkDatabaseHealth();
    res.status(200).json({
      status: "ok",
      service: "commitmentpool-backend",
      chainId: String(monadConfig.chainId),
      rpcUrl: monadConfig.rpcUrl,
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealth.isConnected,
        status: dbHealth.status,
      },
    });
  })
);

// Mount API Modules
app.use("/api/auth", userRoutes);
app.use("/api/me", userRoutes); // Alias for legacy test and client compatibility
app.use("/api/challenges/:id/submissions", challengeSubmissionsRouter);
app.use("/api/challenges", challengeRoutes);
app.use("/api/submissions", submissionVotesRouter);

// 404 Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

export default app;
export { app };
