import { useState } from "react";
import { useCommitmentWallet } from "../../hooks/useCommitmentWallet";
import { shortAddress } from "../../services/monadRpc";

export default function WalletCard() {
  const { address } = useCommitmentWallet();
  const [message, setMessage] = useState("");

  async function copyAddress() {
    if (!address) {
      setMessage("Wallet is not available.");
      return;
    }
    try {
      await navigator.clipboard.writeText(address);
      setMessage("Wallet address copied.");
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("Could not copy the wallet address.");
      setTimeout(() => setMessage(""), 2500);
    }
  }

  if (!address) {
    return (
      <section className="panel">
        <div className="panel-head">
          <h3>Embedded Wallet</h3>
          <span className="badge amber">Unavailable</span>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          Wallet unavailable. Please check your Privy embedded wallet setup or reconnect your account.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Your Embedded Monad Wallet</h3>
        <span className="badge green">● Active</span>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
            WALLET ADDRESS (SHORT)
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", marginTop: 2 }}>
            {shortAddress(address)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
            FULL ADDRESS
          </div>
          <div
            style={{
              fontSize: 12,
              fontFamily: "monospace",
              background: "#f7f0e8",
              padding: "8px 12px",
              borderRadius: 8,
              marginTop: 4,
              wordBreak: "break-all",
            }}
          >
            {address}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button
          type="button"
          onClick={copyAddress}
          className="btn secondary small"
          id="copyWalletBtn"
        >
          📋 Copy Address
        </button>
        {message && (
          <span role="status" style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>
            {message}
          </span>
        )}
      </div>
    </section>
  );
}
