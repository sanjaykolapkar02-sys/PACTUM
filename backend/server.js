"use strict";
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createRemoteJWKSet } = require("jose");
const { verifyAccessToken, InvalidAuthTokenError } = require("@privy-io/node");

// 🔒 Env validation 🔒
const REQUIRED_ENV = ["PRIVY_APP_ID", "PRIVY_APP_SECRET"];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error("[startup] Missing required environment variables:", missing.join(", "));
  console.error("[startup] Copy .env.example to .env and fill in all values.");
  process.exit(1);
}

const PRIVY_APP_ID     = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const FRONTEND_ORIGIN  = process.env.FRONTEND_ORIGIN || "http://localhost:8000";
const PORT             = parseInt(process.env.PORT || "3001", 10);
const MONAD_RPC_URL    = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const MONAD_CHAIN_ID   = process.env.MONAD_CHAIN_ID || "10143";

// 🔑 Privy JWKS (remote key set - caches keys automatically via jose) 🔑
// Privy JWKS endpoint: https://auth.privy.io/api/v1/apps/<appId>/jwks.json
const PRIVY_JWKS_URL = `https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`;
let appJWKS;
function getJWKS() {
  if (!appJWKS) {
    appJWKS = createRemoteJWKSet(new URL(PRIVY_JWKS_URL));
  }
  return appJWKS;
}

// 👤 Privy REST API helper (for fetching user profile) 👤
async function privyGetUser(userId) {
  const url = `https://auth.privy.io/api/v1/users/${userId}`;
  const credentials = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString("base64");
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      "privy-app-id": PRIVY_APP_ID
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Privy API error ${res.status}: ${body}`);
  }
  return res.json();
}

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:8000")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

function isOriginAllowed(origin, list) {
  if (!origin) return true;
  const norm = origin.replace(/\/+$/, "").toLowerCase();
  return list.some(allowed => {
    const a = allowed.replace(/\/+$/, "").toLowerCase();
    if (a === norm) return true;
    if (a.includes("*")) {
      const reg = "^" + a.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-zA-Z0-9_-]+") + "$";
      return new RegExp(reg).test(norm);
    }
    return false;
  });
}

// 🚀 Express setup 🚀
const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// 🛡️ Auth middleware 🛡️
async function requirePrivyAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Missing or malformed Authorization header. Expected: Bearer <privy-access-token>"
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "unauthorized", message: "Empty access token." });
  }

  try {
    // verifyAccessToken verifies the JWT signature using Privy's JWKS, expiry, and app ID binding
    const claims = await verifyAccessToken({
      access_token: token,
      app_id: PRIVY_APP_ID,
      verification_key: getJWKS()
    });
    req.privyUserId = claims.user_id;
    req.privyClaims = claims;
    next();
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (err instanceof InvalidAuthTokenError) {
      if (msg.includes("expired") || msg.includes("exp")) {
        return res.status(401).json({ error: "token_expired", message: "Access token has expired. Please log in again." });
      }
      return res.status(401).json({ error: "invalid_token", message: "Access token is invalid or was issued for a different app." });
    }
    console.error("[auth middleware] Unexpected error:", err.message);
    return res.status(401).json({ error: "invalid_token", message: "Token verification failed." });
  }
}

// 📡 Routes 📡

// Health check (unauthenticated)
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "commitmentpool-backend",
    chainId: MONAD_CHAIN_ID,
    rpcUrl: MONAD_RPC_URL,
    timestamp: new Date().toISOString()
  });
});

// GET /api/me - returns authenticated user profile
// Frontend sends: Authorization: Bearer <privy-access-token>
app.get("/api/me", requirePrivyAuth, async (req, res) => {
  try {
    const user = await privyGetUser(req.privyUserId);

    // Identify the Privy embedded EVM wallet (type === 'wallet', walletClientType === 'privy')
    const linkedAccounts = user.linked_accounts || [];

    const embeddedWallet = linkedAccounts.find(
      acc => acc.type === "wallet" && acc.wallet_client_type === "privy" && acc.chain_type === "ethereum"
    );

    // Identify Google linked account
    const googleAccount = linkedAccounts.find(acc => acc.type === "google_oauth");

    return res.json({
      privyUserId: user.id,
      email: googleAccount?.email || null,
      name: googleAccount?.name || null,
      embeddedWallet: embeddedWallet
        ? {
            address: embeddedWallet.address,
            chainType: embeddedWallet.chain_type,
            walletClientType: embeddedWallet.wallet_client_type
          }
        : null,
      linkedAccountCount: linkedAccounts.length,
      createdAt: user.created_at
    });
  } catch (err) {
    console.error("[GET /api/me] Error fetching user from Privy:", err.message);
    return res.status(502).json({
      error: "privy_api_error",
      message: "Could not fetch user profile from Privy. Please try again."
    });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "not_found", message: "Route not found." });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[unhandled error]", err);
  res.status(500).json({ error: "internal_error", message: "Internal server error." });
});

// 🚀 Start 🚀
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[CommitmentPool Backend] Listening on http://localhost:${PORT}`);
    console.log(`[CommitmentPool Backend] CORS allowed origin: ${FRONTEND_ORIGIN}`);
    console.log(`[CommitmentPool Backend] Privy App ID: ${PRIVY_APP_ID}`);
    console.log(`[CommitmentPool Backend] Monad Testnet RPC: ${MONAD_RPC_URL} (Chain ID: ${MONAD_CHAIN_ID})`);
    console.log(`[CommitmentPool Backend] JWKS URL: ${PRIVY_JWKS_URL}`);
  });
}

module.exports = app;
