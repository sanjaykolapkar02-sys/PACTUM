// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import FaucetCard from "../components/wallet/FaucetCard";
import { useMonadBalance } from "../hooks/useMonadBalance";
import { MONAD_TESTNET, monadConfig } from "../config/monad";
import * as monadRpcModule from "../services/monadRpc";
import { ManualTransactionModal } from "../components/wallet/ManualTransactionModal";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("Manual-Only Monad Testnet Workflow Suite", () => {
  const dummyAddress1 = "0x71F00000000000000000000000000000000092A4" as const;
  const dummyAddress2 = "0x1234567890123456789012345678901234567890" as const;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  const unmountRoot = async (root: ReturnType<typeof createRoot>) => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  };

  function TestBalanceConsumer({
    address,
    onRender,
  }: {
    address: string | null | undefined;
    onRender?: (state: ReturnType<typeof useMonadBalance>) => void;
  }) {
    const hookState = useMonadBalance(address);
    if (onRender) onRender(hookState);
    return (
      <div>
        <span id="testBalance">{hookState.balance ?? "null"}</span>
        <span id="testLoading">{String(hookState.isLoading)}</span>
        <span id="testError">{hookState.error ?? "null"}</span>
        <span id="testStale">{String(hookState.isStale)}</span>
        <span id="testPollingActive">{String(hookState.isPollingActive)}</span>
        <button id="testManualRefreshBtn" onClick={() => void hookState.refreshBalance()}>
          Refresh
        </button>
      </div>
    );
  }

  describe("Manual useMonadBalance Hook Lifecycle", () => {
    it("1. Initial balance fetch occurs when a valid address is provided", async () => {
      const getBalanceSpy = vi.spyOn(monadRpcModule, 'getMonadBalance').mockResolvedValue({
        address: dummyAddress1,
        balanceWei: 2500000000000000000n,
        balanceMON: "2.5",
        balanceFormatted: "2.5000 MON",
      });

      let latestState: any;
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <TestBalanceConsumer
            address={dummyAddress1}
            onRender={(s) => {
              latestState = s;
            }}
          />
        );
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledWith(dummyAddress1);
      expect(latestState.balance).toBe("2.5000 MON");
      expect(latestState.balanceWei).toBe(2500000000000000000n);
      expect(latestState.error).toBeNull();
      expect(latestState.isStale).toBe(false);
      expect(latestState.isPollingActive).toBe(false); // Manual-only mode
      expect(latestState.lastUpdated).toBeInstanceOf(Date);
      await unmountRoot(root);
    });

    it("2. Does NOT automatically poll in the background (manual-only)", async () => {
      vi.useFakeTimers();
      const getBalanceSpy = vi.spyOn(monadRpcModule, "getMonadBalance").mockResolvedValue({
        address: dummyAddress1,
        balanceWei: 1000000000000000000n,
        balanceMON: "1.0",
        balanceFormatted: "1.0000 MON",
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<TestBalanceConsumer address={dummyAddress1} />);
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      // Advance by 60 seconds - should NOT make automatic calls
      await act(async () => {
        vi.advanceTimersByTime(60_000);
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);
      await unmountRoot(root);
      vi.useRealTimers();
    });

    it("3. Manual refresh queries the live RPC on user demand", async () => {
      const getBalanceSpy = vi.spyOn(monadRpcModule, "getMonadBalance").mockResolvedValue({
        address: dummyAddress1,
        balanceWei: 1000000000000000000n,
        balanceMON: "1.0",
        balanceFormatted: "1.0000 MON",
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<TestBalanceConsumer address={dummyAddress1} />);
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      const manualBtn = container.querySelector("#testManualRefreshBtn") as HTMLButtonElement;
      await act(async () => {
        manualBtn.click();
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(2);
      await unmountRoot(root);
    });

    it("4. RPC errors preserve the last valid balance and set isStale", async () => {
      const getBalanceSpy = vi.spyOn(monadRpcModule, "getMonadBalance");

      getBalanceSpy.mockResolvedValueOnce({
        address: dummyAddress1,
        balanceWei: 2000000000000000000n,
        balanceMON: "2.0",
        balanceFormatted: "2.0000 MON",
      });

      let latestState: any;
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <TestBalanceConsumer
            address={dummyAddress1}
            onRender={(s) => {
              latestState = s;
            }}
          />
        );
        await Promise.resolve();
      });

      expect(latestState.balance).toBe("2.0000 MON");
      expect(latestState.isStale).toBe(false);

      // Subsequent manual refresh fails with network error
      getBalanceSpy.mockRejectedValueOnce(new Error("Monad RPC connection reset"));

      await act(async () => {
        await latestState.refreshBalance();
        await Promise.resolve();
      });

      expect(latestState.balance).toBe("2.0000 MON");
      expect(latestState.isStale).toBe(true);
      expect(latestState.error).toContain("Monad RPC connection reset");

      await unmountRoot(root);
    });

    it("5. Prevents duplicate overlapping in-flight RPC requests", async () => {
      let resolveFirstCall: (value: any) => void;
      const deferredPromise = new Promise((resolve) => {
        resolveFirstCall = resolve;
      });

      const getBalanceSpy = vi
        .spyOn(monadRpcModule, "getMonadBalance")
        .mockReturnValueOnce(deferredPromise as any);

      let latestState: any;
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <TestBalanceConsumer
            address={dummyAddress1}
            onRender={(s) => {
              latestState = s;
            }}
          />
        );
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      // Attempt second manual refresh while first is unresolved
      await act(async () => {
        void latestState.refreshBalance();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFirstCall!({
          address: dummyAddress1,
          balanceWei: 1000000000000000000n,
          balanceMON: "1.0",
          balanceFormatted: "1.0000 MON",
        });
        await Promise.resolve();
      });

      await unmountRoot(root);
    });

    it("6. Changing wallet address resets balance and fetches the new wallet balance", async () => {
      const getBalanceSpy = vi.spyOn(monadRpcModule, "getMonadBalance");

      getBalanceSpy.mockResolvedValueOnce({
        address: dummyAddress1,
        balanceWei: 1000000000000000000n,
        balanceMON: "1.0",
        balanceFormatted: "1.0000 MON",
      });

      let latestState: any;
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <TestBalanceConsumer
            address={dummyAddress1}
            onRender={(s) => {
              latestState = s;
            }}
          />
        );
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledWith(dummyAddress1);
      expect(latestState.balance).toBe("1.0000 MON");

      getBalanceSpy.mockResolvedValueOnce({
        address: dummyAddress2,
        balanceWei: 5000000000000000000n,
        balanceMON: "5.0",
        balanceFormatted: "5.0000 MON",
      });

      await act(async () => {
        root.render(
          <TestBalanceConsumer
            address={dummyAddress2}
            onRender={(s) => {
              latestState = s;
            }}
          />
        );
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledWith(dummyAddress2);
      expect(latestState.balance).toBe("5.0000 MON");
      await unmountRoot(root);
    });
  });

  describe("Manual FaucetCard Component Experience", () => {
    it("7. Renders heading, network, address, balance, and manual badge without emojis", async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <FaucetCard
            walletAddress={dummyAddress1}
            balance="1.5000 MON"
            isLoading={false}
            error={null}
            lastUpdated={new Date("2026-10-10T12:00:00Z")}
            onRefresh={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain("Get Testnet MON");
      expect(container.textContent).toContain("Network: Monad Testnet");
      expect(container.textContent).toContain("Manual Refresh");
      expect(container.textContent).toContain(dummyAddress1);
      expect(container.textContent).toContain("1.5000 MON");
      expect(container.textContent).toContain("Copy Address");

      // Verify no emojis are in the rendered text
      expect(container.textContent).not.toMatch(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
      await unmountRoot(root);
    });

    it("8. 'Get Testnet MON' opens official faucet URL safely in a new tab", async () => {
      const windowOpenMock = vi.fn();
      vi.stubGlobal("open", windowOpenMock);

      const root = createRoot(container);
      await act(async () => {
        root.render(
          <FaucetCard
            walletAddress={dummyAddress1}
            balance="0.0000 MON"
            isLoading={false}
            error={null}
            lastUpdated={null}
            onRefresh={vi.fn()}
          />
        );
      });

      const getMonBtn = container.querySelector("#getTestnetMonBtn") as HTMLButtonElement;
      expect(getMonBtn).not.toBeNull();

      await act(async () => {
        getMonBtn.click();
      });

      expect(windowOpenMock).toHaveBeenCalledWith(
        "https://faucet.monad.xyz/",
        "_blank",
        "noopener,noreferrer"
      );

      expect(container.textContent).toContain("Manual Request Opened:");
      expect(container.textContent).toContain("Refresh Balance");
      await unmountRoot(root);
    });

    it("9. Clicking 'Refresh Balance' calls onRefresh callback directly", async () => {
      const onRefreshMock = vi.fn().mockResolvedValue(undefined);

      const root = createRoot(container);
      await act(async () => {
        root.render(
          <FaucetCard
            walletAddress={dummyAddress1}
            balance="0.0000 MON"
            isLoading={false}
            error={null}
            lastUpdated={null}
            onRefresh={onRefreshMock}
          />
        );
      });

      const refreshBtn = container.querySelector("#refreshBalanceBtn") as HTMLButtonElement;
      await act(async () => {
        refreshBtn.click();
      });

      expect(onRefreshMock).toHaveBeenCalledTimes(1);
      await unmountRoot(root);
    });
  });

  describe("Manual Transaction Modal", () => {
    it("10. Displays transaction details before confirmation", async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <ManualTransactionModal
            isOpen={true}
            onClose={vi.fn()}
            title="Manual Testnet Stake"
            description="Approve your commitment stake manually on Monad Testnet."
            amountMon="5.00"
            isContractCall={false}
            recipientAddress={dummyAddress2}
          />
        );
      });

      expect(container.textContent).toContain("Manual Testnet Stake");
      expect(container.textContent).toContain("Monad Testnet (10143)");
      expect(container.textContent).toContain("5.00 MON");
      expect(container.querySelector("#manualTxApproveBtn")).not.toBeNull();
      expect(container.querySelector("#manualTxRejectBtn")).not.toBeNull();

      await unmountRoot(root);
    });

    it("11. Shows explicit warning when contract address is missing", async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <ManualTransactionModal
            isOpen={true}
            onClose={vi.fn()}
            title="Contract Call"
            description="Execute on-chain pool interaction."
            isContractCall={true}
            recipientAddress={null}
          />
        );
      });

      expect(container.textContent).toContain("Contract Address Required:");
      expect(container.textContent).toContain("VITE_COMMITMENT_POOL_CONTRACT_ADDRESS");

      const approveBtn = container.querySelector("#manualTxApproveBtn") as HTMLButtonElement;
      expect(approveBtn.disabled).toBe(true);

      await unmountRoot(root);
    });
  });

  describe("Configuration and Security Verification", () => {
    it("12. Official faucet URL and Explorer URLs are correctly configured", () => {
      expect(MONAD_TESTNET.faucetUrl).toBe("https://faucet.monad.xyz/");
      expect(monadConfig.explorerUrl).toBe("https://testnet.monadexplorer.com");
      expect(MONAD_TESTNET.chainId).toBe(10143);
    });

    it("13. No automatic claim APIs exist in monadRpc service", () => {
      expect(Object.keys(monadRpcModule)).not.toContain("claimFaucet");
      expect(Object.keys(monadRpcModule)).not.toContain("autoClaim");
      expect(Object.keys(monadRpcModule)).not.toContain("requestFaucetTokens");
    });
  });
});
