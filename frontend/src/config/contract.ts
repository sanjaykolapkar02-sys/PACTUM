import { isAddress } from "viem";
import { monadConfig } from "./monad";

/**
 * Smart Contract Deployment Configuration for Frontend
 * Contract address is supplied via VITE_COMMITMENT_POOL_CONTRACT_ADDRESS.
 * No mock addresses or zero addresses (0x000...000) are accepted as valid deployments.
 */
const rawAddress = (import.meta.env.VITE_COMMITMENT_POOL_CONTRACT_ADDRESS || "").trim();

const isValid =
  rawAddress.length === 42 &&
  rawAddress.startsWith("0x") &&
  rawAddress !== "0x0000000000000000000000000000000000000000" &&
  isAddress(rawAddress);

export const commitmentPoolAddress: `0x${string}` | null = isValid
  ? (rawAddress as `0x${string}`)
  : null;

/**
 * Retrieves the deployed contract address or throws an explicit configuration error.
 */
export function getCommitmentPoolAddress(): `0x${string}` {
  if (!commitmentPoolAddress) {
    throw new Error(
      `CommitmentPool smart contract address is not configured for Monad Testnet (${monadConfig.chainId}). Please set VITE_COMMITMENT_POOL_CONTRACT_ADDRESS in frontend/.env.`
    );
  }
  return commitmentPoolAddress;
}
