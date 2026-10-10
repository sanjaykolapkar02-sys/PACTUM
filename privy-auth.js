/**
 * privy-auth.js - CommitmentPool
 * Shared Privy authentication, wallet management, and faucet utilities.
 *
 * Loaded as a plain <script> in every HTML page.
 * Uses @privy-io/js-sdk-core via CDN (headless, no React required).
 *
 * Configuration:
 *   window.CP_CONFIG can be configured via config.js or inline:
 *   <script src="config.js"></script>
 *   <script src="privy-auth.js" defer></script>
 *
 * Monad Testnet:
 *   Chain ID : 10143
 *   RPC URL  : https://testnet-rpc.monad.xyz
 *   Symbol   : MON
 *   Explorer : https://testnet.monadscan.com
 *   Faucet   : https://faucet.monad.xyz
 */

(function () {
  'use strict';

  // ⛓️ Monad Testnet constants ⛓️
  const MONAD_TESTNET = {
    chainId: 10143,
    chainIdHex: '0x279f',
    name: 'Monad Testnet',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    symbol: 'MON',
    decimals: 18,
    explorerUrl: 'https://testnet.monadscan.com',
    faucetUrl: 'https://faucet.monad.xyz'
  };

  // 🔑 Storage keys 🔑
  const STORAGE = {
    accessToken: 'cp_privy_access_token',
    userId: 'cp_privy_user_id',
    walletAddress: 'cp_wallet_address',
    profileCache: 'cp_profile_cache'
  };

  // 🔌 Privy client instance (initialised once) 🔌
  let _privy = null;
  let _initPromise = null;

  function getConfig() {
    const cfg = (typeof window !== 'undefined' && window.CP_CONFIG) || {};
    if (!cfg.privyAppId || cfg.privyAppId === 'YOUR_APP_ID' || cfg.privyAppId === 'YOUR_PRIVY_APP_ID') {
      throw new Error(
        'CommitmentPool: Privy App ID is not configured. ' +
        'Set your Privy App ID in config.js or window.CP_CONFIG before privy-auth.js.'
      );
    }
    return {
      privyAppId: cfg.privyAppId,
      backendUrl: (cfg.backendUrl || 'http://localhost:3001').replace(/\/$/, ''),
      monadRpcUrl: cfg.monadRpcUrl || MONAD_TESTNET.rpcUrl,
      monadChainId: cfg.monadChainId || MONAD_TESTNET.chainId
    };
  }

  /**
   * Initialise the Privy client once.
   * Uses the global `Privy` constructor from the CDN bundle.
   */
  async function initPrivy() {
    if (_privy) return _privy;
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
      const { privyAppId } = getConfig();

      // Wait for CDN script to make `Privy` available on window
      let attempts = 0;
      while (typeof window !== 'undefined' && typeof window.Privy === 'undefined' && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
      if (typeof window === 'undefined' || typeof window.Privy === 'undefined') {
        throw new Error(
          'Privy SDK not loaded. Ensure the CDN script is included before privy-auth.js.'
        );
      }

      _privy = new window.Privy({ appId: privyAppId });
      return _privy;
    })();

    return _initPromise;
  }

  // 💾 Session helpers 💾

  function saveSession(accessToken, userId, walletAddress) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE.accessToken, accessToken || '');
        localStorage.setItem(STORAGE.userId, userId || '');
        localStorage.setItem(STORAGE.walletAddress, walletAddress || '');
      }
    } catch (_) { /* private browsing */ }
  }

  function clearSession() {
    try {
      if (typeof localStorage !== 'undefined') {
        Object.values(STORAGE).forEach(k => localStorage.removeItem(k));
      }
    } catch (_) { }
  }

  function getSavedSession() {
    try {
      if (typeof localStorage !== 'undefined') {
        return {
          accessToken: localStorage.getItem(STORAGE.accessToken) || '',
          userId: localStorage.getItem(STORAGE.userId) || '',
          walletAddress: localStorage.getItem(STORAGE.walletAddress) || ''
        };
      }
    } catch (_) { }
    return { accessToken: '', userId: '', walletAddress: '' };
  }

  // 👛 Embedded wallet helpers 👛

  /**
   * Find the Privy embedded EVM wallet in the user's linked accounts.
   * Avoids assuming wallets[0] - explicitly checks type and walletClientType.
   */
  function findEmbeddedWallet(user) {
    if (!user || !user.linkedAccounts) return null;
    return user.linkedAccounts.find(
      acc =>
        acc.type === 'wallet' &&
        acc.walletClientType === 'privy' &&
        acc.chainType === 'ethereum'
    ) || null;
  }

  // 💰 Balance helpers 💰

  /**
   * Fetch the native MON balance for an address from Monad Testnet RPC.
   * Returns { balanceWei: BigInt, balanceFormatted: string } or throws.
   */
  async function getMonadBalance(address) {
    const cfg = (typeof window !== 'undefined' && window.CP_CONFIG) || {};
    const rpcUrl = cfg.monadRpcUrl || MONAD_TESTNET.rpcUrl;

    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest']
    });

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    if (!res.ok) throw new Error(`RPC HTTP error: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`RPC error: ${data.error.message}`);

    // data.result is hex like "0x1a2b3c..."
    const balanceWei = BigInt(data.result || '0x0');
    const balanceFormatted = formatMON(balanceWei);
    return { balanceWei, balanceFormatted };
  }

  /**
   * Format a wei BigInt to a human-readable MON string without floating-point
   * precision errors (uses only integer arithmetic).
   */
  function formatMON(wei) {
    const WEI_PER_MON = BigInt('1000000000000000000'); // 1e18
    const whole = wei / WEI_PER_MON;
    const frac  = wei % WEI_PER_MON;
    // Show 4 decimal places
    const fracStr = frac.toString().padStart(18, '0').slice(0, 4);
    return `${whole}.${fracStr} MON`;
  }

  // 🌐 Backend API helpers 🌐

  async function fetchProfile(accessToken) {
    const { backendUrl } = getConfig();
    const res = await fetch(`${backendUrl}/api/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw Object.assign(new Error(body.message || `HTTP ${res.status}`), { status: res.status, body });
    }
    return res.json();
  }

  // 🚀 Main auth flow 🚀

  /**
   * Begin Google OAuth login.
   * Triggers Privy's OAuth redirect flow.
   */
  async function loginWithGoogle() {
    const p = await initPrivy();
    // initOAuth with Google provider - Privy handles the redirect/popup
    await p.auth.oauth.initOAuth({ provider: 'google' });
  }

  /**
   * Complete the OAuth callback (call on page load after redirect returns).
   * Returns { user, accessToken, embeddedWallet } or null if not in callback.
   */
  async function completeOAuthCallback() {
    const p = await initPrivy();
    try {
      const result = await p.auth.oauth.loginWithOAuth();
      if (!result || !result.user) return null;

      const { user, accessToken } = result;
      const embeddedWallet = findEmbeddedWallet(user);
      saveSession(accessToken, user.id, embeddedWallet?.address || '');
      return { user, accessToken, embeddedWallet };
    } catch (e) {
      // Not in an OAuth callback or another error - swallow gracefully
      return null;
    }
  }

  /**
   * Restore the existing session (if valid) without re-prompting the user.
   * Returns the current user object or null.
   */
  async function restoreSession() {
    const p = await initPrivy();
    try {
      const user = await p.auth.getUser();
      if (!user) return null;
      const accessToken = await p.auth.getAccessToken();
      const embeddedWallet = findEmbeddedWallet(user);
      saveSession(accessToken, user.id, embeddedWallet?.address || '');
      return { user, accessToken, embeddedWallet };
    } catch (_) {
      return null;
    }
  }

  /**
   * Create the embedded wallet if the user doesn't have one yet.
   * Privy's createOnLogin config usually handles this automatically,
   * but this can be called as a fallback.
   */
  async function ensureEmbeddedWallet() {
    const p = await initPrivy();
    const user = await p.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const existing = findEmbeddedWallet(user);
    if (existing) return existing;

    // Create embedded wallet
    const wallet = await p.embeddedWallet.create();
    if (!wallet) throw new Error('Embedded wallet creation returned null');
    return wallet;
  }

  /**
   * Logout - clears Privy session and local storage.
   */
  async function logout() {
    try {
      const p = await initPrivy();
      await p.auth.logout();
    } catch (_) { }
    clearSession();
  }

  /**
   * Get the current authenticated session state.
   * Returns { authenticated, user, accessToken, embeddedWallet } or { authenticated: false }.
   */
  async function getAuthState() {
    const p = await initPrivy();
    try {
      const user = await p.auth.getUser();
      if (!user) return { authenticated: false };
      const accessToken = await p.auth.getAccessToken();
      const embeddedWallet = findEmbeddedWallet(user);
      return { authenticated: true, user, accessToken, embeddedWallet };
    } catch (_) {
      return { authenticated: false };
    }
  }

  // 💧 Faucet helpers 💧

  function openFaucet() {
    if (typeof window !== 'undefined') {
      window.open(MONAD_TESTNET.faucetUrl, '_blank', 'noopener,noreferrer');
    }
  }

  async function copyToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else if (typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  // 🛠️ Utilities 🛠️

  function shortAddress(addr) {
    if (!addr || addr.length < 10) return addr || '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  // 📦 Public API 📦

  const api = {
    // Core auth
    initPrivy,
    loginWithGoogle,
    completeOAuthCallback,
    restoreSession,
    ensureEmbeddedWallet,
    logout,
    getAuthState,

    // Wallet
    findEmbeddedWallet,
    getMonadBalance,
    formatMON,

    // Backend
    fetchProfile,

    // Faucet
    openFaucet,
    copyToClipboard,

    // Utils
    shortAddress,
    getSavedSession,
    saveSession,
    clearSession,
    getConfig,

    // Constants (read-only)
    MONAD_TESTNET: Object.freeze(MONAD_TESTNET)
  };

  if (typeof window !== 'undefined') {
    window.PrivyAuth = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
