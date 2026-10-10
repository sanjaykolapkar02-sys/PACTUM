// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import FaucetCard from '../components/wallet/FaucetCard';
import { useMonadBalance } from '../hooks/useMonadBalance';
import { MONAD_TESTNET, monadConfig } from '../config/monad';
import * as monadRpcModule from '../services/monadRpc';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Monad Testnet Faucet Integration & Automatic Refresh Suite', () => {
  const dummyAddress1 = '0x71F00000000000000000000000000000000092A4' as const;
  const dummyAddress2 = '0x1234567890123456789012345678901234567890' as const;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
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

  // Test Consumer Component for useMonadBalance
  function TestBalanceConsumer({
    address,
    intervalMs = 15_000,
    onRender,
  }: {
    address: string | null | undefined;
    intervalMs?: number;
    onRender?: (state: ReturnType<typeof useMonadBalance>) => void;
  }) {
    const hookState = useMonadBalance(address, intervalMs);
    if (onRender) onRender(hookState);
    return (
      <div>
        <span id="testBalance">{hookState.balance ?? 'null'}</span>
        <span id="testLoading">{String(hookState.isLoading)}</span>
        <span id="testError">{hookState.error ?? 'null'}</span>
        <span id="testStale">{String(hookState.isStale)}</span>
        <span id="testPollingActive">{String(hookState.isPollingActive)}</span>
        <button id="testManualRefreshBtn" onClick={() => void hookState.refreshBalance()}>
          Refresh
        </button>
        <button id="testQuickPollBtn" onClick={() => hookState.startQuickPolling()}>
          Quick Poll
        </button>
      </div>
    );
  }

  describe('PHASE 2 & 4 — useMonadBalance Automatic Refresh & Lifecycle', () => {
    it('1. Initial balance fetch occurs when a valid address is provided', async () => {
      const getBalanceSpy = vi.spyOn(monadRpcModule, 'getMonadBalance').mockResolvedValue({
        address: dummyAddress1,
        balanceWei: 2500000000000000000n,
        balanceMON: '2.5',
        balanceFormatted: '2.5000 MON',
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
      expect(latestState.balance).toBe('2.5000 MON');
      expect(latestState.balanceWei).toBe(2500000000000000000n);
      expect(latestState.error).toBeNull();
      expect(latestState.isStale).toBe(false);
      expect(latestState.lastUpdated).toBeInstanceOf(Date);
      await unmountRoot(root);
    });

    it('2. Automatically polls Monad RPC at configured 15s interval while visible', async () => {
      vi.useFakeTimers();
      const getBalanceSpy = vi.spyOn(monadRpcModule, 'getMonadBalance').mockResolvedValue({
        address: dummyAddress1,
        balanceWei: 1000000000000000000n,
        balanceMON: '1.0',
        balanceFormatted: '1.0000 MON',
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<TestBalanceConsumer address={dummyAddress1} intervalMs={15_000} />);
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      // Advance by 15 seconds
      await act(async () => {
        vi.advanceTimersByTime(15_000);
        await Promise.resolve();
      });
      expect(getBalanceSpy).toHaveBeenCalledTimes(2);

      // Advance another 15 seconds
      await act(async () => {
        vi.advanceTimersByTime(15_000);
        await Promise.resolve();
      });
      expect(getBalanceSpy).toHaveBeenCalledTimes(3);

      await unmountRoot(root);
      vi.useRealTimers();
    });

    it('3. Polling pauses while the browser tab is hidden', async () => {
      vi.useFakeTimers();
      const getBalanceSpy = vi.spyOn(monadRpcModule, 'getMonadBalance').mockResolvedValue({
        address: dummyAddress1,
        balanceWei: 1000000000000000000n,
        balanceMON: '1.0',
        balanceFormatted: '1.0000 MON',
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<TestBalanceConsumer address={dummyAddress1} intervalMs={15_000} />);
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      // Simulate tab hidden
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();
      });

      // Advance timers by 45 seconds while hidden - should NOT trigger calls
      await act(async () => {
        vi.advanceTimersByTime(45_000);
        await Promise.resolve();
      });
      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      // Restore document.hidden property
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      await unmountRoot(root);
      vi.useRealTimers();
    });

    it('4. Resumes polling and refreshes balance immediately when returning to tab', async () => {
      vi.useFakeTimers();
      const getBalanceSpy = vi.spyOn(monadRpcModule, 'getMonadBalance').mockResolvedValue({
        address: dummyAddress1,
        balanceWei: 1000000000000000000n,
        balanceMON: '1.0',
        balanceFormatted: '1.0000 MON',
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<TestBalanceConsumer address={dummyAddress1} intervalMs={15_000} />);
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      // Hide tab
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();
      });

      // Restore tab visibility
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();
      });

      // Immediate refresh should have occurred
      expect(getBalanceSpy).toHaveBeenCalledTimes(2);

      // Subsequent 15s interval should also continue working
      await act(async () => {
        vi.advanceTimersByTime(15_000);
        await Promise.resolve();
      });
      expect(getBalanceSpy).toHaveBeenCalledTimes(3);

      await unmountRoot(root);
      vi.useRealTimers();
    });

    it('5. Prevents duplicate overlapping in-flight RPC requests', async () => {
      let resolveFirstCall: (value: any) => void;
      const deferredPromise = new Promise((resolve) => {
        resolveFirstCall = resolve;
      });

      const getBalanceSpy = vi
        .spyOn(monadRpcModule, 'getMonadBalance')
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

      // Should still only have called RPC once due to isFetchingRef guard
      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      // Resolve the initial promise
      await act(async () => {
        resolveFirstCall!({
          address: dummyAddress1,
          balanceWei: 1000000000000000000n,
          balanceMON: '1.0',
          balanceFormatted: '1.0000 MON',
        });
        await Promise.resolve();
      });

      // Now that initial completed, subsequent manual refresh should succeed
      getBalanceSpy.mockResolvedValueOnce({
        address: dummyAddress1,
        balanceWei: 1000000000000000000n,
        balanceMON: '1.0',
        balanceFormatted: '1.0000 MON',
      });

      await act(async () => {
        await latestState.refreshBalance();
        await Promise.resolve();
      });
      expect(getBalanceSpy).toHaveBeenCalledTimes(2);

      await unmountRoot(root);
    });

    it('6. Timers and event listeners are cleaned up on unmount', async () => {
      vi.useFakeTimers();
      const getBalanceSpy = vi.spyOn(monadRpcModule, 'getMonadBalance').mockResolvedValue({
        address: dummyAddress1,
        balanceWei: 1000000000000000000n,
        balanceMON: '1.0',
        balanceFormatted: '1.0000 MON',
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<TestBalanceConsumer address={dummyAddress1} intervalMs={15_000} />);
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      await unmountRoot(root);

      // Advance by 60 seconds after unmount
      await act(async () => {
        vi.advanceTimersByTime(60_000);
        await Promise.resolve();
      });

      // Trigger visibility change after unmount
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('7. RPC errors preserve the last valid balance and set isStale', async () => {
      const getBalanceSpy = vi.spyOn(monadRpcModule, 'getMonadBalance');

      // First call succeeds
      getBalanceSpy.mockResolvedValueOnce({
        address: dummyAddress1,
        balanceWei: 2000000000000000000n,
        balanceMON: '2.0',
        balanceFormatted: '2.0000 MON',
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

      expect(latestState.balance).toBe('2.0000 MON');
      expect(latestState.isStale).toBe(false);

      // Second call fails with network error
      getBalanceSpy.mockRejectedValueOnce(new Error('Monad RPC connection reset'));

      await act(async () => {
        await latestState.refreshBalance();
        await Promise.resolve();
      });

      // Balance must NOT be replaced with null or fabricated 0 MON
      expect(latestState.balance).toBe('2.0000 MON');
      expect(latestState.isStale).toBe(true);
      expect(latestState.error).toContain('Monad RPC connection reset');

      await unmountRoot(root);
    });

    it('8. Missing or invalid addresses do not trigger RPC calls', async () => {
      const getBalanceSpy = vi.spyOn(monadRpcModule, 'getMonadBalance');
      let latestState: any;

      // Null address
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <TestBalanceConsumer
            address={null}
            onRender={(s) => {
              latestState = s;
            }}
          />
        );
        await Promise.resolve();
      });
      expect(getBalanceSpy).not.toHaveBeenCalled();
      expect(latestState.balance).toBeNull();

      // Invalid format address
      await act(async () => {
        root.render(
          <TestBalanceConsumer
            address="invalid-ethereum-address"
            onRender={(s) => {
              latestState = s;
            }}
          />
        );
        await Promise.resolve();
      });
      expect(getBalanceSpy).not.toHaveBeenCalled();
      expect(latestState.error).toContain('Invalid wallet address format');

      await unmountRoot(root);
    });

    it('9. Manual refresh continues to work and updates balance', async () => {
      const getBalanceSpy = vi.spyOn(monadRpcModule, 'getMonadBalance').mockResolvedValue({
        address: dummyAddress1,
        balanceWei: 1000000000000000000n,
        balanceMON: '1.0',
        balanceFormatted: '1.0000 MON',
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(<TestBalanceConsumer address={dummyAddress1} />);
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(1);

      const manualBtn = container.querySelector('#testManualRefreshBtn') as HTMLButtonElement;
      await act(async () => {
        manualBtn.click();
        await Promise.resolve();
      });

      expect(getBalanceSpy).toHaveBeenCalledTimes(2);
      await unmountRoot(root);
    });

    it('12. Changing wallet address resets balance and fetches the new wallet balance', async () => {
      const getBalanceSpy = vi.spyOn(monadRpcModule, 'getMonadBalance');

      getBalanceSpy.mockResolvedValueOnce({
        address: dummyAddress1,
        balanceWei: 1000000000000000000n,
        balanceMON: '1.0',
        balanceFormatted: '1.0000 MON',
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
      expect(latestState.balance).toBe('1.0000 MON');

      // Change address to dummyAddress2
      getBalanceSpy.mockResolvedValueOnce({
        address: dummyAddress2,
        balanceWei: 5000000000000000000n,
        balanceMON: '5.0',
        balanceFormatted: '5.0000 MON',
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
      expect(latestState.balance).toBe('5.0000 MON');
      await unmountRoot(root);
    });
  });

  describe('PHASE 3 & 4 — FaucetCard Component Experience', () => {
    it('renders heading, network, wallet address, and balance correctly', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <FaucetCard
            walletAddress={dummyAddress1}
            balance="1.5000 MON"
            isLoading={false}
            error={null}
            lastUpdated={new Date('2026-10-10T12:00:00Z')}
            onRefresh={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('Get Testnet MON');
      expect(container.textContent).toContain('Network: Monad Testnet');
      expect(container.textContent).toContain(dummyAddress1);
      expect(container.textContent).toContain('1.5000 MON');
      expect(container.textContent).toContain('Last checked:');
      await unmountRoot(root);
    });

    it('10. "Get Testnet MON" opens the official Faucet URL safely in a new tab', async () => {
      const windowOpenMock = vi.fn();
      vi.stubGlobal('open', windowOpenMock);

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

      const getMonBtn = container.querySelector('#getTestnetMonBtn') as HTMLButtonElement;
      expect(getMonBtn).not.toBeNull();

      await act(async () => {
        getMonBtn.click();
      });

      expect(windowOpenMock).toHaveBeenCalledWith(
        'https://faucet.monad.xyz/',
        '_blank',
        'noopener,noreferrer'
      );

      // Verify guidance message explaining automatic balance detection
      expect(container.textContent).toContain(
        'Official Faucet opened in a new tab. After requesting testnet MON on faucet.monad.xyz, return here.'
      );
      await unmountRoot(root);
    });

    it('11. The UI does not falsely claim a faucet request succeeded when balance is unchanged', async () => {
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

      // User opens faucet
      const getMonBtn = container.querySelector('#getTestnetMonBtn') as HTMLButtonElement;
      await act(async () => {
        getMonBtn.click();
      });

      // User returns and clicks refresh, but balance is still unchanged
      const refreshBtn = container.querySelector('#refreshBalanceBtn') as HTMLButtonElement;
      await act(async () => {
        refreshBtn.click();
      });

      // Must NOT show false success message
      expect(container.textContent).not.toContain('✓ New tokens detected!');
      // Must explain tokens have not arrived yet
      expect(container.textContent).toContain('Tokens have not arrived yet');

      await unmountRoot(root);
    });

    it('shows success notice only when balance actually changes after visiting faucet', async () => {
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

      // User clicks Get Testnet MON
      const getMonBtn = container.querySelector('#getTestnetMonBtn') as HTMLButtonElement;
      await act(async () => {
        getMonBtn.click();
      });

      // Rerender with updated balance from RPC
      await act(async () => {
        root.render(
          <FaucetCard
            walletAddress={dummyAddress1}
            balance="1.0000 MON"
            isLoading={false}
            error={null}
            lastUpdated={new Date()}
            onRefresh={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('✓ New tokens detected!');
      await unmountRoot(root);
    });

    it('renders stale data indicator when isStale is true', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <FaucetCard
            walletAddress={dummyAddress1}
            balance="1.5000 MON"
            isLoading={false}
            error="RPC temporary rate limit"
            lastUpdated={new Date()}
            isStale={true}
            onRefresh={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('● Stale');
      expect(container.textContent).toContain('1.5000 MON');
      expect(container.textContent).toContain('RPC Warning:');
      expect(container.textContent).toContain('showing last confirmed balance');
      await unmountRoot(root);
    });

    it('supports quick polling action button after visiting faucet', async () => {
      const quickPollMock = vi.fn();
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
            onStartQuickPolling={quickPollMock}
          />
        );
      });

      // Visit faucet
      const getMonBtn = container.querySelector('#getTestnetMonBtn') as HTMLButtonElement;
      await act(async () => {
        getMonBtn.click();
      });

      // Quick check button should appear
      const quickBtn = container.querySelector('#iveRequestedMonBtn') as HTMLButtonElement;
      expect(quickBtn).not.toBeNull();

      await act(async () => {
        quickBtn.click();
      });

      expect(quickPollMock).toHaveBeenCalled();
      await unmountRoot(root);
    });
  });

  describe('Security and Non-Automation Verification', () => {
    it('does not expose any automated faucet claim API or private keys', () => {
      expect(Object.keys(monadRpcModule)).not.toContain('claimFaucet');
      expect(Object.keys(monadRpcModule)).not.toContain('autoClaim');
      expect(Object.keys(monadRpcModule)).not.toContain('requestFaucetTokens');
    });

    it('official faucet URL is https://faucet.monad.xyz/ on Monad Testnet 10143', () => {
      expect(MONAD_TESTNET.faucetUrl).toBe('https://faucet.monad.xyz/');
      expect(monadConfig.faucetUrl).toBe('https://faucet.monad.xyz/');
      expect(MONAD_TESTNET.chainId).toBe(10143);
    });
  });
});
