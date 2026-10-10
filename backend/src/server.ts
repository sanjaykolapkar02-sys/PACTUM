import app from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";

let server: ReturnType<typeof app.listen> | null = null;

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB before accepting HTTP traffic
    console.log("[Server] Connecting to MongoDB...");
    await connectDatabase(env.MONGODB_URI);

    server = app.listen(env.PORT, () => {
      console.log(`[Server] CommitmentPool API listening on port ${env.PORT} (${env.NODE_ENV})`);
      console.log(`[Server] CORS allowed origin: ${env.FRONTEND_ORIGIN}`);
      console.log(`[Server] Monad Testnet Chain ID: ${env.MONAD_CHAIN_ID} (${env.MONAD_RPC_URL})`);
    });
  } catch (error) {
    console.error("[Server] Fatal startup error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[Server] ${signal} received. Initiating graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log("[Server] HTTP server closed");
      await disconnectDatabase();
      console.log("[Server] Process terminating cleanly");
      process.exit(0);
    });

    // Force exit after 10 seconds if shutdown hangs
    setTimeout(() => {
      console.error("[Server] Forceful shutdown initiated after timeout");
      process.exit(1);
    }, 10_000).unref();
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
}

process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));

if (require.main === module) {
  void startServer();
}

export { startServer, gracefulShutdown };
