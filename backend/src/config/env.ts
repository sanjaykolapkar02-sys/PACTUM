import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z
    .string()
    .default("4000")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 65535, {
      message: "PORT must be a valid port number (1-65535)",
    }),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5174"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required and cannot be empty"),
  PRIVY_APP_ID: z.string().min(1, "PRIVY_APP_ID is required and cannot be empty"),
  PRIVY_APP_SECRET: z.string().min(1, "PRIVY_APP_SECRET is required and cannot be empty"),
  MONAD_RPC_URL: z.string().url().default("https://testnet-rpc.monad.xyz"),
  MONAD_CHAIN_ID: z
    .string()
    .default("10143")
    .transform((val) => parseInt(val, 10))
    .refine((val) => val === 10143, {
      message: "MONAD_CHAIN_ID must be 10143 for Monad Testnet",
    }),
  COMMITMENT_POOL_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address format (must be 0x followed by 40 hex characters)")
    .optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Collect redacted error messages (never log actual credentials or values)
    const issues = parsed.error.issues.map((issue) => {
      const field = issue.path.join(".");
      return `  - ${field}: ${issue.message}`;
    });

    console.error("[Configuration Error] Missing or invalid environment variables:");
    console.error(issues.join("\n"));
    console.error("[Configuration Error] Ensure backend/.env contains all required keys (refer to .env.example).");

    throw new Error("Invalid backend environment configuration");
  }

  return parsed.data;
}

export const env = loadEnv();
