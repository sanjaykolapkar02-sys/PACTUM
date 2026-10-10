import { RefreshCw } from "lucide-react";
import { useCommitmentWallet } from "../../hooks/useCommitmentWallet";
import { useMonadBalance } from "../../hooks/useMonadBalance";

export default function WalletBalance() {
  const { address } = useCommitmentWallet();
  const { balance, isLoading: loading, error, refreshBalance } = useMonadBalance(address);

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Monad Testnet Native Balance</h3>
        <span className="badge green">Live RPC</span>
      </div>

      <div style={{ margin: "8px 0 14px" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
            <span className="spinner" /> Querying Monad Testnet balance...
          </div>
        )}

        {!loading && balance !== null && (
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--brown)" }}>
              {balance}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              Native gas currency for transaction fees on Chain ID 10143
            </div>
          </div>
        )}

        {error && (
          <div className="notice error" role="alert" style={{ margin: "8px 0" }}>
            {error}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void refreshBalance()}
        disabled={loading || !address}
        className="btn secondary small"
        id="refreshBalanceBtn"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        {loading ? <span className="spinner" /> : <RefreshCw size={14} />}
        <span>Refresh Balance</span>
      </button>
    </section>
  );
}
