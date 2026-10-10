import { useState, useEffect, useRef } from "react";
import { isAddress } from "viem";
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
  onStartQuickPolling,
}: FaucetCardProps) {
  const [copied, setCopied] = useState(false);
  const [hasVisitedFaucet, setHasVisitedFaucet] = useState(false);
  const [faucetVisitNotice, setFaucetVisitNotice] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const prevBalanceRef = useRef<string | null>(balance);

  const isValidAddress = Boolean(walletAddress && isAddress(walletAddress));
  const displayAddress = isValidAddress ? shortAddress(walletAddress) : null;

  // Track balance changes to detect when faucet funds arrive
  useEffect(() => {
    if (prevBalanceRef.current && balance && balance !== prevBalanceRef.current) {
      if (hasVisitedFaucet) {
        setSuccessNotice("✓ New tokens detected! Your Monad Testnet balance has updated.");
        setPendingNotice(null);
        setFaucetVisitNotice(null);
      }
    }
    prevBalanceRef.current = balance;
  }, [balance, hasVisitedFaucet]);

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
    setHasVisitedFaucet(true);
    setSuccessNotice(null);
    setPendingNotice(null);
    setFaucetVisitNotice(
      "Official Faucet opened in a new tab. After requesting testnet MON on faucet.monad.xyz, return here. The dashboard will automatically detect your new balance."
    );
    onStartQuickPolling?.();
    window.open(MONAD_TESTNET.faucetUrl, "_blank", "noopener,noreferrer");
  }

  async function handleRefresh() {
    if (!walletAddress || isLoading) return;
    const currentBalanceBefore = balance;
    await onRefresh();

    if (hasVisitedFaucet) {
      if (currentBalanceBefore && balance && currentBalanceBefore === balance) {
        setPendingNotice(
          "Tokens have not arrived yet. Faucet transactions may still be pending in the network queue or subject to Faucet restrictions. Automatic 15s refresh is active."
        );
      } else {
        setPendingNotice(null);
      }
    }
  }

  function handleClaimedAction() {
    onStartQuickPolling?.();
    void handleRefresh();
  }

  // Parse if balance is zero or low
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
          <span className="badge green">● Chain ID {MONAD_TESTNET.chainId}</span>
          <span className="badge" style={{ background: "#f0e7dc", color: "var(--dark)", fontSize: 11 }}>
            Auto-refresh (15s)
          </span>
        </div>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
        Claim free native <strong>{MONAD_TESTNET.nativeCurrency.symbol}</strong> tokens from the official Monad
        Testnet Faucet to fund transaction fees for your CommitmentPool embedded wallet.
      </p>

      {/* Wallet Status & Address */}
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
              }}
              aria-label="Copy wallet address"
            >
              {copied ? "✓ Copied!" : "📋 Copy Address"}
            </button>
          </div>
        </div>
      ) : (
        <div className="notice warning" role="alert" style={{ marginBottom: 18 }}>
          <strong>Wallet Unavailable:</strong> Connect your wallet through Privy first to view your address and request tokens.
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
                ● Stale
              </span>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 16 }}>
              <span className="spinner" style={{ width: 14, height: 14 }} />
              <span>Checking balance…</span>
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
            Network & Detection
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
        <div className="notice error" role="alert" style={{ marginBottom: 16 }}>
          <strong>RPC Warning:</strong> {error}{balance !== null ? " (showing last confirmed balance)" : ""}
        </div>
      )}

      {/* Success Notice when new balance arrives */}
      {successNotice && (
        <div className="notice success" role="status" style={{ marginBottom: 16 }}>
          {successNotice}
        </div>
      )}

      {/* Faucet Visit Guide Notice */}
      {faucetVisitNotice && !successNotice && (
        <div className="notice info" role="status" style={{ marginBottom: 16 }}>
          ℹ️ {faucetVisitNotice}
        </div>
      )}

      {/* Pending Notice after faucet visit if balance has not changed */}
      {pendingNotice && !successNotice && (
        <div className="notice warning" role="status" style={{ marginBottom: 16 }}>
          ⏳ {pendingNotice}
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
          <span>💧</span> Get Testnet MON
        </button>

        {hasVisitedFaucet && (
          <button
            type="button"
            onClick={handleClaimedAction}
            disabled={!walletAddress || !isValidAddress || isLoading}
            className="btn secondary"
            id="iveRequestedMonBtn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 18px",
              fontSize: 14,
              border: "1px solid var(--brown)",
              fontWeight: 700,
            }}
          >
            <span>⚡</span> I've Requested MON (Quick Check)
          </button>
        )}

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
          {isLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "🔄"}
          <span>{isLoading ? "Refreshing…" : "Refresh Balance"}</span>
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
          Automatic balance detection workflow:
        </p>
        <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
          <li>Copy your embedded wallet address above.</li>
          <li>Click <strong>Get Testnet MON</strong> to open the official faucet.</li>
          <li>Paste your address and complete the faucet claim on faucet.monad.xyz.</li>
          <li>Return to this dashboard. Polling automatically checks every 15 seconds (and resumes immediately on tab focus).</li>
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
            Open Official Monad Faucet ↗
          </a>
        </div>
      </div>
    </section>
  );
}
