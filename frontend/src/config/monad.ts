/**
 * src/config/monad.ts
 * Centralized Monad Testnet configuration
 */

const rpcUrl = import.meta.env.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const chainId = Number(import.meta.env.VITE_MONAD_CHAIN_ID || "10143");

if (!Number.isInteger(chainId) || chainId <= 0) {
  throw new Error("Invalid Monad chain ID configuration");
}

export const monadConfig = {
  chainId,
  hexChainId: `0x${chainId.toString(16)}`,
  rpcUrl,
  faucetUrl: "https://faucet.monad.xyz/",
  currencySymbol: "MON",
  currencyName: "Monad",
  decimals: 18,
} as const;

export const MONAD_TESTNET = {
  chainId: monadConfig.chainId,
  chainIdHex: monadConfig.hexChainId,
  name: "Monad Testnet",
  rpcUrl: monadConfig.rpcUrl,
  faucetUrl: monadConfig.faucetUrl,
  nativeCurrency: {
    name: monadConfig.currencyName,
    symbol: monadConfig.currencySymbol,
    decimals: monadConfig.decimals,
  },
} as const;
