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
 * Manual-only workflow:
 * - Fetches balance on initial mount or when the wallet address changes
 * - No automatic background polling intervals
 * - No automatic tab-visibility re-fetching
 * - Manual balance refresh triggered exclusively by user action
 * - Prevents overlapping/duplicate in-flight requests
 * - Preserves last valid balance if RPC request fails (flags as stale)
 * - Never returns fabricated 0 MON fallback on RPC errors
 */
export function useMonadBalance(
  walletAddress: string | null | undefined,
  _autoRefreshIntervalMs?: number
): UseMonadBalanceReturn {
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceWei, setBalanceWei] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);
  const prevAddressRef = useRef<string | null | undefined>(walletAddress);
  const currentAddressRef = useRef<string | null | undefined>(walletAddress);
  currentAddressRef.current = walletAddress;

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

  // Backward compatibility: manual-only single trigger, no automated loops
  const startQuickPolling = useCallback(() => {
    void refreshBalance();
  }, [refreshBalance]);

  // Handle wallet address changes cleanly
  useEffect(() => {
    if (prevAddressRef.current !== walletAddress) {
      prevAddressRef.current = walletAddress;
      setBalance(null);
      setBalanceWei(null);
      setError(null);
      setLastUpdated(null);
      setIsStale(false);
    }
  }, [walletAddress]);

  // Initial fetch on mount / address change only (no automated interval polling)
  useEffect(() => {
    isMountedRef.current = true;

    if (!walletAddress || !isAddress(walletAddress)) {
      setBalance(null);
      setBalanceWei(null);
      setIsLoading(false);
      if (walletAddress && !isAddress(walletAddress)) {
        setError(`Invalid wallet address format: ${walletAddress}`);
      }
      return;
    }

    // Initial manual read from Monad Testnet RPC
    void refreshBalance();

    return () => {
      isMountedRef.current = false;
    };
  }, [walletAddress, refreshBalance]);

  return {
    balance,
    balanceWei,
    isLoading,
    error,
    lastUpdated,
    isStale,
    isPollingActive: false, // Manual-only mode
    refreshBalance,
    startQuickPolling,
  };
}

export default useMonadBalance;
