import { useWallets, usePrivy } from "@privy-io/react-auth";

/**
 * Retrieves the authenticated user's available wallets and
 * specifically identifies the Privy embedded EVM wallet.
 */
export function useCommitmentWallet() {
  const { wallets } = useWallets();
  const { user } = usePrivy();

  const isEmbedded = (clientType?: string) =>
    clientType === "privy" || clientType === "privy-v2";

  // First search in active connected wallets
  const wallet = wallets.find((item) => isEmbedded(item.walletClientType));

  // Fallback to linkedAccounts if wallets array is still hydrating
  const embeddedAccount = !wallet
    ? (user?.linkedAccounts?.find(
        (item) => item.type === "wallet" && isEmbedded(item.walletClientType)
      ) as { address?: string } | undefined)
    : undefined;

  const address = (wallet?.address ?? embeddedAccount?.address ?? null) as `0x${string}` | null;

  return {
    wallet,
    address,
  };
}

export default useCommitmentWallet;
