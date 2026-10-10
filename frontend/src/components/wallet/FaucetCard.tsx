import { useState } from "react";
import { isAddress } from "viem";
import { Copy, Check, ExternalLink, RefreshCw, AlertCircle, Info } from "lucide-react";
import { MONAD_TESTNET } from "../../config/monad";
import { shortAddress } from "../../services/monadRpc";

export type FaucetCardProps = {
  walletAddress: string | null;
  balance: string | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isStale?: boolean;
  onRefresh: () => Promise<void>;
  onStartQuickPolling?: () => void;
};

export default function FaucetCard({
  walletAddress,
  balance,
  isLoading,
  error,
  lastUpdated,
  isStale = false,
  onRefresh,
}: FaucetCardProps) {
  const [copied, setCopied] = useState(false);
  const [faucetOpened, setFaucetOpened] = useState(false);

  const isValidAddress = Boolean(walletAddress && isAddress(walletAddress));
  const displayAddress = isValidAddress ? shortAddress(walletAddress) : null;

  async function copyAddress() {
    if (!walletAddress || !isValidAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  function openFaucet() {
    if (!walletAddress || !isValidAddress) return;
    setFaucetOpened(true);
    window.open(MONAD_TESTNET.faucetUrl, "_blank", "noopener,noreferrer");
  }

  async function handleRefresh() {
    if (!walletAddress || isLoading) return;
    await onRefresh();
  }

  const isZeroBalance = balance === "0.0000 MON" || balance === "0 MON";

  return (
    <section
      aria-labelledby="faucet-heading"
      className="panel"
      id="faucetCardSection"
      style={{
        background: "var(--surface)",
        borderRadius: 20,
        padding: "24px 28px",
        boxShadow: "var(--shadow)",
        border: "1px solid var(--line)",
      }}
    >
      <div className="panel-head" style={{ marginBottom: 12 }}>
        <div>
          <span className="eyebrow" style={{ color: "var(--mid)", display: "block" }}>
            Network: {MONAD_TESTNET.name}
          </span>
          <h2 id="faucet-heading" style={{ margin: "4px 0 0", fontSize: 20, letterSpacing: "-0.03em" }}>
            Get Testnet MON
          </h2>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="badge green">Chain ID {MONAD_TESTNET.chainId}</span>
          <span className="badge" style={{ background: "#f0e7dc", color: "var(--dark)", fontSize: 11 }}>
            Manual Refresh
          </span>
        </div>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
        Request testnet <strong>{MONAD_TESTNET.nativeCurrency.symbol}</strong> tokens from the official Monad
        Testnet Faucet to fund transaction fees for your CommitmentPool embedded wallet.
      </p>

      {/* Wallet Status and Address */}
      {walletAddress && isValidAddress ? (
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--muted)",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Your Privy Embedded Wallet
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#f7f0e8",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                flex: 1,
                wordBreak: "break-all",
                color: "var(--dark)",
                fontWeight: 600,
              }}
              title={walletAddress}
            >
              <span className="hidden-mobile">{walletAddress}</span>
              <span className="visible-mobile" style={{ display: "none" }}>{displayAddress}</span>
            </div>
            <button
              type="button"
              onClick={copyAddress}
              id="faucetCopyAddressBtn"
              className="btn secondary small"
              style={{
                padding: "6px 12px",
                fontSize: 12,
                whiteSpace: "nowrap",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              aria-label="Copy wallet address"
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Address</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="notice warning" role="alert" style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} />
          <span><strong>Wallet Unavailable:</strong> Connect your wallet through Privy to view your address and request tokens.</span>
        </div>
      )}

      {/* Balance Metric Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
        aria-live="polite"
      >
        <div
          style={{
            background: "#f7f0e8",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <small
              style={{
                display: "block",
                color: "var(--muted)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              Current MON Balance
            </small>
            {isStale && (
              <span style={{ fontSize: 10, color: "var(--amber)", fontWeight: 700 }}>
                Stale
              </span>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 16 }}>
              <span className="spinner" style={{ width: 14, height: 14 }} />
              <span>Checking balance...</span>
            </div>
          ) : error && balance === null ? (
            <div role="alert" style={{ color: "var(--red)", fontSize: 13, fontWeight: 700 }}>
              Balance unavailable
            </div>
          ) : balance !== null ? (
            <div
              id="monBalanceValue"
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: isZeroBalance ? "var(--amber)" : "var(--green)",
                letterSpacing: "-0.03em",
              }}
            >
              {balance}
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>Balance unavailable</div>
          )}
        </div>

        <div
          style={{
            background: "#f7f0e8",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <small
            style={{
              display: "block",
              color: "var(--muted)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Network & Status
          </small>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dark)", marginTop: 4 }}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--green)",
                marginRight: 6,
              }}
            />
            {MONAD_TESTNET.name}
          </div>
          {lastUpdated && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              Last checked: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="notice error" role="alert" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} />
          <span><strong>RPC Warning:</strong> {error}{balance !== null ? " (showing last confirmed balance)" : ""}</span>
        </div>
      )}

      {/* Manual Faucet Status Guidance */}
      {faucetOpened && (
        <div className="notice info" role="status" style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Info size={16} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <strong>Manual Request Opened:</strong> After completing your claim on the official faucet tab, return here and click <strong>Refresh Balance</strong> below to query your updated balance from the Monad RPC.
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <button
          type="button"
          onClick={openFaucet}
          disabled={!walletAddress || !isValidAddress}
          className="btn"
          id="getTestnetMonBtn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            fontSize: 14,
            background: "var(--brown)",
          }}
        >
          <ExternalLink size={16} />
          <span>Get Testnet MON</span>
        </button>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={!walletAddress || !isValidAddress || isLoading}
          className="btn secondary"
          id="refreshBalanceBtn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            fontSize: 14,
          }}
        >
          {isLoading ? (
            <span className="spinner" style={{ width: 14, height: 14 }} />
          ) : (
            <RefreshCw size={15} />
          )}
          <span>{isLoading ? "Refreshing..." : "Refresh Balance"}</span>
        </button>
      </div>

      {/* Instructions */}
      <div
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: 16,
          fontSize: 12.5,
          color: "var(--muted)",
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: "0 0 8px", fontWeight: 700, color: "var(--dark)" }}>
          Manual Testnet Funding Instructions:
        </p>
        <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
          <li>Copy your embedded wallet address above.</li>
          <li>Click <strong>Get Testnet MON</strong> to open the official Monad faucet in a new tab.</li>
          <li>Paste your address on the faucet website and submit your request.</li>
          <li>Return to this page and click <strong>Refresh Balance</strong> to read the confirmed balance from the Monad Testnet RPC.</li>
        </ol>

        <div style={{ marginTop: 12 }}>
          <a
            href={MONAD_TESTNET.faucetUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="officialFaucetLink"
            style={{
              color: "var(--brown)",
              fontWeight: 700,
              textDecoration: "underline",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>Open Official Monad Faucet</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}
