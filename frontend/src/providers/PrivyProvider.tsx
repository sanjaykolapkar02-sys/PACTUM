import type { ReactNode } from "react";
import { PrivyProvider as OfficialPrivyProvider } from "@privy-io/react-auth";
import { defineChain } from "viem";
import { monadConfig } from "../config/monad";

export const monadTestnet = defineChain({
  id: monadConfig.chainId,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: monadConfig.decimals,
    name: monadConfig.currencyName,
    symbol: monadConfig.currencySymbol,
  },
  rpcUrls: {
    default: {
      http: [monadConfig.rpcUrl],
    },
    public: {
      http: [monadConfig.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadScan",
      url: "https://testnet.monadscan.com",
    },
  },
  testnet: true,
});

interface AppPrivyProviderProps {
  children: ReactNode;
}

const appId = import.meta.env.VITE_PRIVY_APP_ID;

export function AppPrivyProvider({ children }: AppPrivyProviderProps) {
  if (!appId || appId === "YOUR_ACTUAL_PRIVY_APP_ID" || appId === "YOUR_PRIVY_APP_ID") {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          padding: 20,
          background: "#fbf7f0",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            background: "#fff",
            padding: 32,
            borderRadius: 16,
            border: "1px solid #ebdcd0",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#8a2424", margin: "0 0 12px", fontSize: 20 }}>
            Privy App ID Configuration Required
          </h2>
          <p style={{ fontSize: 14, color: "#6e6056", lineHeight: 1.6, margin: "0 0 8px" }}>
            Missing or unconfigured <code>VITE_PRIVY_APP_ID</code> in <code>.env.local</code>.
          </p>
          <p style={{ fontSize: 12, color: "#9c8e82", margin: 0 }}>
            Configure your official Privy App ID in <code>frontend/.env.local</code> to enable Google OAuth and Monad embedded wallets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <OfficialPrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#6b4428",
          walletList: ["detected_wallets", "metamask", "rainbow", "wallet_connect"],
        },
        loginMethods: ["google"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        externalWallets: {
          coinbaseWallet: {
            config: {
              preference: {
                options: "eoaOnly",
              },
            },
          },
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
      }}
    >
      {children}
    </OfficialPrivyProvider>
  );
}

export default AppPrivyProvider;
