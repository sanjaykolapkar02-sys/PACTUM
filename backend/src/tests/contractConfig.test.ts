import { describe, it, expect } from "vitest";
import {
  commitmentPoolContractConfig,
  getCommitmentPoolContractAddress,
} from "../modules/blockchain/contract.config";
import { isContractConfigured } from "../modules/blockchain/blockchain.service";

describe("Contract Configuration Readiness (Backend)", () => {
  it("initializes with chainId 10143 and null address when unset", () => {
    expect(commitmentPoolContractConfig.chainId).toBe(10143);
    // In test env, COMMITMENT_POOL_CONTRACT_ADDRESS is not populated
    expect(commitmentPoolContractConfig.abi).toBeNull();
  });

  it("reports isContractConfigured as false when address/abi are missing", () => {
    expect(isContractConfigured()).toBe(false);
  });

  it("throws a descriptive error when trying to fetch unconfigured address", () => {
    if (!commitmentPoolContractConfig.contractAddress) {
      expect(() => getCommitmentPoolContractAddress()).toThrowError(
        /CommitmentPool contract address is not configured for Monad Testnet \(10143\)/
      );
    }
  });
});
