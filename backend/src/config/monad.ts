import { env } from "./env";

export const monadConfig = {
  chainId: env.MONAD_CHAIN_ID,
  rpcUrl: env.MONAD_RPC_URL,
} as const;
