import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useCommitmentWallet } from "../hooks/useCommitmentWallet";
import { useMonadBalance } from "../hooks/useMonadBalance";
import { Copy, Check, LogOut, Bell, Globe } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import WalletCard from "../components/wallet/WalletCard";
import FaucetCard from "../components/wallet/FaucetCard";

export function ProfilePage() {
  const { user, logout } = usePrivy();
  const { address } = useCommitmentWallet();
  const {
    balance,
    isLoading,
    error,
    lastUpdated,
    isStale,
    refreshBalance,
    startQuickPolling,
  } = useMonadBalance(address);

  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const googleAccount = user?.linkedAccounts?.find((acc) => acc.type === "google_oauth");
  const email =
    (googleAccount && "email" in googleAccount && (googleAccount as { email: string }).email) ||
    "user@pactum.app";
  const name =
    (googleAccount && "name" in googleAccount && googleAccount.name) ||
    "Commitment Maker";

  const handleCopy = () => {
    if (address) {
      void navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "var(--color-text)", letterSpacing: "-0.03em" }}>
          Profile & Embedded Wallet
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 20px" }}>
          Manage your Privy authenticated session, preferences, and embedded Monad wallet.
        </p>

        {/* Profile Details Card */}
        <div className="pactum-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--gradient-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>
                {name[0]}
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--color-text)" }}>
                  {name}
                </h2>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                  {email}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="pactum-btn-secondary"
              style={{ color: "var(--color-danger)", borderColor: "rgba(195, 79, 88, 0.3)" }}
              id="logoutBtn"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--color-border)", display: "flex", flexWrap: "wrap", gap: 14 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Privy ID: <code style={{ color: "var(--color-text)" }}>{user?.id ? `${user.id.slice(0, 14)}...` : "Authenticated"}</code>
            </div>

            {address && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Wallet:</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="pactum-wallet-pill"
                  style={{ padding: "3px 8px", fontSize: 11 }}
                  id="profileCopyWalletBtn"
                >
                  <span>{address.slice(0, 8)}...{address.slice(-6)}</span>
                  {copied ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Embedded Wallet Cards Section */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px", color: "var(--color-text)" }}>
            Monad Testnet Wallet
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            <WalletCard />
            <FaucetCard
              walletAddress={address}
              balance={balance}
              isLoading={isLoading}
              error={error}
              lastUpdated={lastUpdated}
              isStale={isStale}
              onRefresh={refreshBalance}
              onStartQuickPolling={startQuickPolling}
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="pactum-card">
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 14px", color: "var(--color-text)" }}>
            Preferences & Settings
          </h2>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: "1px solid var(--color-border)", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Bell size={18} color="var(--color-primary-dark)" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>Submission Reminders</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Receive alerts before daily submission deadlines</div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Globe size={18} color="var(--color-primary-dark)" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>Time Zone</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Used for calculating daily review windows</div>
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary-dark)" }}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default ProfilePage;
