import { useState } from "react";
import { Link } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { useCommitmentWallet } from "../../hooks/useCommitmentWallet";
import { Copy, Check, User as UserIcon, Shield } from "lucide-react";

export function AppHeader() {
  const { user } = usePrivy();
  const { address } = useCommitmentWallet();
  const [copied, setCopied] = useState(false);

  const googleAccount = user?.linkedAccounts?.find(
    (acc) => acc.type === "google_oauth"
  );
  const email =
    (googleAccount && "email" in googleAccount && (googleAccount as { email: string }).email) ||
    "user@pactum.app";

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "0xConnect...Wallet";

  const handleCopy = () => {
    if (address) {
      void navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="pactum-header">
      <Link to="/dashboard" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="pactum-brand">
          <div className="pactum-brand-logo">P</div>
          <div>
            <h1 className="pactum-brand-title">PACTUM</h1>
            <p className="pactum-brand-sub">Habit Accountability</p>
          </div>
        </div>
      </Link>

      <div className="pactum-user-meta">
        <div style={{ textAlign: "right", marginRight: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
            {email}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--color-success)", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
              <Shield size={11} /> Monad Testnet
            </span>
          </div>
        </div>

        {address && (
          <button
            type="button"
            onClick={handleCopy}
            className="pactum-wallet-pill"
            title="Click to copy full wallet address"
            id="copyWalletBtn"
          >
            <span>{shortAddress}</span>
            {copied ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
          </button>
        )}

        <Link
          to="/profile"
          className="pactum-btn-secondary"
          style={{ padding: "8px 12px" }}
          title="Profile & Settings"
          id="profileNavBtn"
        >
          <UserIcon size={15} />
        </Link>
      </div>
    </header>
  );
}

export default AppHeader;
