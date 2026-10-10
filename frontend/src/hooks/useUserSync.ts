import { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { pactumApi, setTokenProvider, type BackendUser } from "../services/apiClient";

export interface UserSyncState {
  backendUser: BackendUser | null;
  isLoading: boolean;
  error: Error | null;
  syncUser: () => Promise<BackendUser | null>;
}

export function useUserSync(): UserSyncState {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const inFlightRef = useRef<boolean>(false);
  const lastSyncUserId = useRef<string | null>(null);

  // Keep API client's token provider synchronized with Privy
  useEffect(() => {
    if (ready && authenticated) {
      setTokenProvider(async () => {
        try {
          return await getAccessToken();
        } catch {
          return null;
        }
      });
    } else {
      setTokenProvider(null);
      setBackendUser(null);
      lastSyncUserId.current = null;
    }
  }, [ready, authenticated, getAccessToken]);

  const syncUser = async (): Promise<BackendUser | null> => {
    if (!ready || !authenticated || inFlightRef.current) {
      return backendUser;
    }

    try {
      inFlightRef.current = true;
      setIsLoading(true);
      setError(null);

      const user = await pactumApi.getMe();
      setBackendUser(user);
      return user;
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      return null;
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ready && authenticated && !backendUser && !inFlightRef.current) {
      void syncUser();
    }
  }, [ready, authenticated]);

  return {
    backendUser,
    isLoading,
    error,
    syncUser,
  };
}

export default useUserSync;
