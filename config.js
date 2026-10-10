/**
 * config.js - Central CommitmentPool Configuration
 *
 * Put your Privy App ID here once to configure the entire frontend!
 *
 * 1. Get your Privy App ID from: https://dashboard.privy.io -> Settings -> API Keys
 * 2. Replace 'YOUR_PRIVY_APP_ID' with your real App ID below.
 * 3. Never put your PRIVY_APP_SECRET here! The App Secret belongs strictly in backend/.env.
 */
(function () {
  const APP_CONFIG = {
    // Put your Privy App ID here:
    privyAppId: 'YOUR_PRIVY_APP_ID',

    // Backend API URL
    backendUrl: 'http://localhost:3001',

    // Monad Testnet Configuration
    monadRpcUrl: 'https://testnet-rpc.monad.xyz',
    monadChainId: 10143
  };

  if (typeof window !== 'undefined') {
    const existing = window.CP_CONFIG || {};
    const effectiveAppId = (existing.privyAppId && existing.privyAppId !== 'YOUR_PRIVY_APP_ID' && existing.privyAppId !== 'YOUR_APP_ID')
      ? existing.privyAppId
      : APP_CONFIG.privyAppId;

    window.CP_CONFIG = {
      privyAppId: effectiveAppId,
      backendUrl: existing.backendUrl || APP_CONFIG.backendUrl,
      monadRpcUrl: existing.monadRpcUrl || APP_CONFIG.monadRpcUrl,
      monadChainId: existing.monadChainId || APP_CONFIG.monadChainId
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CONFIG;
  }
})();
