import { describe, it, expect } from "vitest";
import { commitmentPoolAddress, getCommitmentPoolAddress } from "../config/contract";

describe("Contract Configuration Readiness (Frontend)", () => {
  it("defaults to null when environment variable is unset", () => {
    // In test environment without VITE_COMMITMENT_POOL_CONTRACT_ADDRESS set
    expect(commitmentPoolAddress).toBeNull();
  });

  it("throws a descriptive error when trying to retrieve an unconfigured contract address", () => {
    expect(() => getCommitmentPoolAddress()).toThrowError(
      /CommitmentPool smart contract address is not configured for Monad Testnet \(10143\)/
    );
  });
});
