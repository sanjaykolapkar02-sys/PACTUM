import { env } from "../../config/env";
import { isAddress } from "viem";

/**
 * Contract configuration placeholders.
 * The Solidity contract source, ABI, and deployed contract address will be provided later.
 * No functions, addresses, or ABIs are hardcoded or fabricated here.
 */
export interface ContractDeploymentConfig {
  chainId: number;
  contractAddress: `0x${string}` | null;
  abi: readonly unknown[] | null;
  deployedAtBlock?: number;
}

const configuredAddress =
  env.COMMITMENT_POOL_CONTRACT_ADDRESS && isAddress(env.COMMITMENT_POOL_CONTRACT_ADDRESS)
    ? (env.COMMITMENT_POOL_CONTRACT_ADDRESS as `0x${string}`)
    : null;

export const commitmentPoolContractConfig: ContractDeploymentConfig = {
  chainId: env.MONAD_CHAIN_ID,
  contractAddress: configuredAddress, // Read from COMMITMENT_POOL_CONTRACT_ADDRESS in .env
  abi: null,                         // To be supplied from compiled Solidity artifact
};

export function getCommitmentPoolContractAddress(): `0x${string}` {
  if (!commitmentPoolContractConfig.contractAddress) {
    throw new Error(
      `CommitmentPool contract address is not configured for Monad Testnet (${commitmentPoolContractConfig.chainId}). Please set COMMITMENT_POOL_CONTRACT_ADDRESS in backend/.env.`
    );
  }
  return commitmentPoolContractConfig.contractAddress;
}

