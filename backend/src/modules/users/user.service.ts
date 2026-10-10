import UserModel, { UserDocument } from "./user.model";
import { env } from "../../config/env";

export interface PrivyUserProfile {
  id: string;
  created_at?: string;
  linked_accounts?: Array<{
    type: string;
    address?: string;
    chain_type?: string;
    wallet_client_type?: string;
    email?: string;
    name?: string;
  }>;
}

/**
 * Fetch verified user profile directly from Privy REST API using server credentials.
 */
export async function fetchPrivyUser(userId: string): Promise<PrivyUserProfile> {
  const url = `https://auth.privy.io/api/v1/users/${userId}`;
  const credentials = Buffer.from(`${env.PRIVY_APP_ID}:${env.PRIVY_APP_SECRET}`).toString("base64");

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      "privy-app-id": env.PRIVY_APP_ID,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Privy API returned status ${response.status}: ${errorText}`);
  }

  return (await response.json()) as PrivyUserProfile;
}

/**
 * Upserts a user in the local MongoDB database using the verified Privy user ID.
 */
export async function upsertUserFromPrivy(
  privyUserId: string,
  extraData?: {
    walletAddress?: string | null;
    displayName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  }
): Promise<UserDocument> {
  const update: Record<string, unknown> = {
    privyUserId,
  };

  if (extraData?.walletAddress !== undefined) {
    update.walletAddress = extraData.walletAddress?.toLowerCase() || null;
  }
  if (extraData?.displayName !== undefined) {
    update.displayName = extraData.displayName;
  }
  if (extraData?.email !== undefined) {
    update.email = extraData.email?.toLowerCase() || null;
  }
  if (extraData?.avatarUrl !== undefined) {
    update.avatarUrl = extraData.avatarUrl;
  }

  const user = await UserModel.findOneAndUpdate(
    { privyUserId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return user;
}

/**
 * Finds user by stable privyUserId.
 */
export async function findUserByPrivyId(privyUserId: string): Promise<UserDocument | null> {
  return UserModel.findOne({ privyUserId });
}
