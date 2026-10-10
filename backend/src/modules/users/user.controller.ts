import { Request, Response } from "express";
import { upsertUserFromPrivy, findUserByPrivyId, fetchPrivyUser } from "./user.service";

/**
 * Controller for GET /api/auth/me
 * Retrieves current authenticated user profile, syncing with Privy linked accounts if available.
 */
export async function getAuthenticatedUser(req: Request, res: Response): Promise<void> {
  const privyUserId = req.user?.userId;

  if (!privyUserId) {
    res.status(401).json({
      success: false,
      error: "unauthorized",
      message: "No authenticated user in context",
    });
    return;
  }

  try {
    // Attempt to sync linked accounts (embedded wallet and Google profile) from Privy
    let user = await findUserByPrivyId(privyUserId);

    try {
      const privyProfile = await fetchPrivyUser(privyUserId);
      const linked = privyProfile.linked_accounts || [];

      // Find embedded EVM wallet
      const embeddedWallet = linked.find(
        (acc) =>
          acc.type === "wallet" &&
          acc.wallet_client_type === "privy" &&
          acc.chain_type === "ethereum"
      );

      // Find Google linked account
      const googleAccount = linked.find((acc) => acc.type === "google_oauth");

      user = await upsertUserFromPrivy(privyUserId, {
        walletAddress: embeddedWallet?.address || user?.walletAddress || null,
        email: googleAccount?.email || user?.email || null,
        displayName: googleAccount?.name || user?.displayName || null,
      });
    } catch {
      // If Privy REST API is unreachable in offline/mock environment, fallback to existing or initial user
      if (!user) {
        user = await upsertUserFromPrivy(privyUserId);
      }
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        privyUserId: user.privyUserId,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retrieve user profile";
    res.status(500).json({
      success: false,
      error: "user_retrieval_failed",
      message,
    });
  }
}
