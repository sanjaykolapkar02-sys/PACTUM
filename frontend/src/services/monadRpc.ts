import { createPublicClient, formatEther, http, isAddress } from "viem";
import { monadConfig, MONAD_TESTNET } from "../config/monad";
import { monadTestnet } from "../providers/PrivyProvider";

export { monadConfig, MONAD_TESTNET };
export const MONAD_TESTNET_CONFIG = monadConfig;

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(monadConfig.rpcUrl),
});

/**
 * Fetch native MON balance for an address from Monad Testnet RPC.
 */
export async function getMonadBalance(address: string) {
  if (!address || !isAddress(address)) {
    throw new Error(`Invalid EVM address provided: ${address}`);
  }

  const balanceWei = await publicClient.getBalance({
    address: address as `0x${string}`,
  });

  return {
    address,
    balanceWei,
    balanceMON: formatEther(balanceWei),
    balanceFormatted: formatMON(balanceWei),
  };
}

/**
 * Verify network connection against expected Monad Testnet Chain ID.
 */
export async function verifyMonadNetwork() {
  const chainId = await publicClient.getChainId();

  if (chainId !== monadConfig.chainId) {
    throw new Error(
      `Unexpected network. Expected chain ID ${monadConfig.chainId}, received ${chainId}.`
    );
  }

  return chainId;
}

/**
 * Fetch the connected chain ID from RPC.
 */
export async function getConnectedChainId() {
  return verifyMonadNetwork();
}

/**
 * Format a wei BigInt into human-readable MON using pure integer arithmetic (4 decimals).
 */
export function formatMON(wei: bigint): string {
  const WEI_PER_MON = BigInt("1000000000000000000"); // 1e18
  const whole = wei / WEI_PER_MON;
  const frac = wei % WEI_PER_MON;
  const fracStr = frac.toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fracStr} MON`;
}

/**
 * Shorten an EVM address for display: 0x1234...5678
 */
export function shortAddress(addr?: string | null): string {
  if (!addr) return "";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Wait for a transaction receipt on Monad Testnet and verify actual block confirmation.
 * Never reports success until the receipt has been returned and verified.
 */
export async function waitForTransactionConfirmation(
  txHash: `0x${string}`,
  timeoutMs: number = 60_000
) {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: timeoutMs,
  });

  return {
    isSuccess: receipt.status === "success",
    status: receipt.status,
    blockNumber: receipt.blockNumber,
    transactionHash: receipt.transactionHash,
    gasUsed: receipt.gasUsed,
  };
}

/**
 * Build block explorer URL for a transaction hash.
 */
export function getExplorerTxUrl(txHash: string): string {
  return `${monadConfig.explorerUrl}/tx/${txHash}`;
}

