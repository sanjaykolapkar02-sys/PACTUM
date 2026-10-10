import { useCallback, useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import { getMonadBalance } from "../services/monadRpc";

export interface UseMonadBalanceReturn {
  balance: string | null;
  balanceWei: bigint | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isStale: boolean;
  isPollingActive: boolean;
  refreshBalance: () => Promise<void>;
  startQuickPolling: () => void;
}

/**
 * Hook for managing Monad native MON token balance from live RPC.
 * - Polls Monad Testnet RPC every 15s while the dashboard is visible
 * - Pauses polling when the browser tab is hidden
 * - Resumes polling and refreshes balance immediately on tab visibility restoration / focus
 * - Prevents overlapping/duplicate in-flight requests
 * - Cleans up interval and visibility event listeners on unmount
 * - Preserves last valid balance if RPC request fails (flags as stale)
 * - Never returns fabricated 0 MON fallback on RPC errors
 * - Supports temporary accelerated quick-polling (5s interval) following faucet actions
 */
export function useMonadBalance(
  walletAddress: string | null | undefined,
  autoRefreshIntervalMs: number = 15_000
): UseMonadBalanceReturn {
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceWei, setBalanceWei] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [isPollingActive, setIsPollingActive] = useState<boolean>(true);

  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);
  const prevAddressRef = useRef<string | null | undefined>(walletAddress);
  const currentAddressRef = useRef<string | null | undefined>(walletAddress);
  currentAddressRef.current = walletAddress;
  const quickPollTimerRef = useRef<number | null>(null);
  const quickPollTicksRef = useRef<number>(0);
  const baseBalanceWeiRef = useRef<bigint | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) {
      if (isMountedRef.current) {
        setBalance(null);
        setBalanceWei(null);
        setError("Wallet address is not available.");
        setIsStale(false);
      }
      return;
    }

    if (!isAddress(walletAddress)) {
      if (isMountedRef.current) {
        setError(`Invalid wallet address format: ${walletAddress}`);
        setIsStale(false);
      }
      return;
    }

    if (isFetchingRef.current) {
      return; // Prevent duplicate overlapping in-flight RPC requests
    }

    isFetchingRef.current = true;
    if (isMountedRef.current) {
      setIsLoading(true);
    }

    const targetAddress = walletAddress;
    try {
      const result = await getMonadBalance(targetAddress);
      if (isMountedRef.current && targetAddress === currentAddressRef.current) {
        setBalance(result.balanceFormatted);
        setBalanceWei(result.balanceWei);
        setLastUpdated(new Date());
        setError(null);
        setIsStale(false);

        // If quick polling was active and balance increased, stop quick polling early
        if (
          baseBalanceWeiRef.current !== null
            ? result.balanceWei > baseBalanceWeiRef.current
            : result.balanceWei > 0n
        ) {
          if (quickPollTimerRef.current !== null) {
            window.clearInterval(quickPollTimerRef.current);
            quickPollTimerRef.current = null;
          }
        }
      }
    } catch (err) {
      if (isMountedRef.current && targetAddress === currentAddressRef.current) {
        const message = err instanceof Error ? err.message : "Failed to fetch balance from Monad RPC";
        setError(message);
        // Preserve last valid balance, mark as stale
        setIsStale(true);
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [walletAddress]);

  // Quick accelerated polling (5-second interval up to 60s after requesting faucet)
  const startQuickPolling = useCallback(() => {
    if (!walletAddress || !isAddress(walletAddress)) return;

    if (quickPollTimerRef.current !== null) {
      window.clearInterval(quickPollTimerRef.current);
    }

    baseBalanceWeiRef.current = balanceWei;
    quickPollTicksRef.current = 0;

    // Trigger immediate refresh
    void refreshBalance();

    quickPollTimerRef.current = window.setInterval(() => {
      // Pause quick polling ticks while tab is hidden
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      quickPollTicksRef.current += 1;
      // Stop after 12 active ticks (60 seconds)
      if (quickPollTicksRef.current >= 12) {
        if (quickPollTimerRef.current !== null) {
          window.clearInterval(quickPollTimerRef.current);
          quickPollTimerRef.current = null;
        }
        return;
      }
      void refreshBalance();
    }, 5_000);
  }, [walletAddress, balanceWei, refreshBalance]);

  // Handle wallet address changes cleanly
  useEffect(() => {
    if (prevAddressRef.current !== walletAddress) {
      prevAddressRef.current = walletAddress;
      setBalance(null);
      setBalanceWei(null);
      setError(null);
      setLastUpdated(null);
      setIsStale(false);
      if (quickPollTimerRef.current !== null) {
        window.clearInterval(quickPollTimerRef.current);
        quickPollTimerRef.current = null;
      }
    }
  }, [walletAddress]);

  // Main lifecycle with 15s interval & visibility listener
  useEffect(() => {
    isMountedRef.current = true;

    if (!walletAddress || !isAddress(walletAddress)) {
      setBalance(null);
      setBalanceWei(null);
      setIsLoading(false);
      setIsPollingActive(false);
      if (walletAddress && !isAddress(walletAddress)) {
        setError(`Invalid wallet address format: ${walletAddress}`);
      }
      return;
    }

    // Initial fetch on mount / address availability
    void refreshBalance();

    let intervalId: number | null = null;

    const startInterval = () => {
      if (intervalId === null) {
        intervalId = window.setInterval(() => {
          if (typeof document !== "undefined" && document.hidden) {
            return;
          }
          void refreshBalance();
        }, autoRefreshIntervalMs);
        setIsPollingActive(true);
      }
    };

    const stopInterval = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
        setIsPollingActive(false);
      }
    };

    // If tab is currently visible, start polling interval
    if (typeof document === "undefined" || !document.hidden) {
      startInterval();
    } else {
      setIsPollingActive(false);
    }

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (typeof document === "undefined") return;

      if (document.hidden) {
        // Tab is hidden, pause polling
        stopInterval();
      } else {
        // Tab is visible again, resume polling and refresh balance immediately
        startInterval();
        void refreshBalance();
      }
    };

    const handleWindowFocus = () => {
      if (typeof document === "undefined" || !document.hidden) {
        void refreshBalance();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleWindowFocus);
    }

    return () => {
      isMountedRef.current = false;
      stopInterval();
      if (quickPollTimerRef.current !== null) {
        window.clearInterval(quickPollTimerRef.current);
        quickPollTimerRef.current = null;
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleWindowFocus);
      }
    };
  }, [walletAddress, autoRefreshIntervalMs, refreshBalance]);

  return {
    balance,
    balanceWei,
    isLoading,
    error,
    lastUpdated,
    isStale,
    isPollingActive,
    refreshBalance,
    startQuickPolling,
  };
}

export default useMonadBalance;
