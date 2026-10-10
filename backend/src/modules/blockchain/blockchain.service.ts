import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import { monadConfig } from "../../config/monad";
import { commitmentPoolContractConfig } from "./contract.config";

export const monadTestnetChain = defineChain({
  id: monadConfig.chainId,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [monadConfig.rpcUrl],
    },
  },
});

/**
 * Read-only public blockchain client for Monad Testnet.
 * Used for querying balances, blocks, transaction confirmations, and reading contract state.
 */
export const publicClient: PublicClient = createPublicClient({
  chain: monadTestnetChain,
  transport: http(monadConfig.rpcUrl),
});

/**
 * Query current block number on Monad Testnet.
 */
export async function getMonadBlockNumber(): Promise<bigint> {
  return publicClient.getBlockNumber();
}

/**
 * Validates whether a transaction hash exists and has confirmed on Monad Testnet.
 */
export async function getTransactionReceipt(txHash: `0x${string}`) {
  return publicClient.getTransactionReceipt({ hash: txHash });
}

/**
 * Placeholder for future contract interactions.
 * Will be implemented once Solidity source, ABI, and deployed contract address are provided.
 */
export function isContractConfigured(): boolean {
  return (
    commitmentPoolContractConfig.contractAddress !== null &&
    commitmentPoolContractConfig.abi !== null
  );
}
