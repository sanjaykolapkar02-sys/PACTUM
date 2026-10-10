import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet } from "jose";
import { verifyAccessToken, InvalidAuthTokenError } from "@privy-io/node";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        claims: Record<string, unknown>;
      };
      privyUserId?: string;
    }
  }
}

// Privy JWKS URL for cryptographic signature verification
const PRIVY_JWKS_URL = `https://auth.privy.io/api/v1/apps/${env.PRIVY_APP_ID}/jwks.json`;

let appJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

export function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (!appJWKS) {
    appJWKS = createRemoteJWKSet(new URL(PRIVY_JWKS_URL));
  }
  return appJWKS;
}

/**
 * Service wrapper around Privy token verification to enable clean testing and isolation.
 */
export const authService = {
  verifyToken: async (token: string): Promise<any> => {
    return verifyAccessToken({
      access_token: token,
      app_id: env.PRIVY_APP_ID,
      verification_key: getJWKS(),
    });
  },
};

/**
 * Authentication middleware verifying Privy session tokens.
 * Extracts Bearer token, verifies cryptographic signature against Privy's JWKS,
 * and attaches the verified user identity to the request context.
 * Never logs tokens or credentials.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rawAuthHeader = (req.headers.authorization || "").trim();

  if (!rawAuthHeader.startsWith("Bearer ") && rawAuthHeader !== "Bearer") {
    res.status(401).json({
      success: false,
      error: "unauthorized",
      message: "Missing or malformed Authorization header. Expected: Bearer <privy-access-token>",
    });
    return;
  }

  const token = rawAuthHeader.startsWith("Bearer ")
    ? rawAuthHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    res.status(401).json({
      success: false,
      error: "unauthorized",
      message: "Empty access token provided",
    });
    return;
  }

  try {
    const claims = await authService.verifyToken(token);

    const userId = (claims as any).user_id || (claims as any).sub;

    if (!userId) {
      throw ApiError.unauthorized("Token payload does not contain a valid user identity");
    }

    req.user = {
      userId,
      claims: claims as Record<string, unknown>,
    };
    req.privyUserId = userId;

    next();
  } catch (err: any) {
    const msg = (err.message || "").toLowerCase();

    if (err instanceof InvalidAuthTokenError || msg.includes("jwt") || msg.includes("token")) {
      if (msg.includes("expired") || msg.includes("exp")) {
        res.status(401).json({
          success: false,
          error: "token_expired",
          message: "Access token has expired. Please log in again.",
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: "invalid_token",
        message: "Access token is invalid or was issued for a different application.",
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: "invalid_token",
      message: "Token verification failed.",
    });
  }
}
