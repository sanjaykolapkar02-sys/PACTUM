import { useState } from "react";
import { X, Check } from "lucide-react";

interface FeeModalProps {
  isOpen: boolean;
  initialAmount: string;
  initialToken: string;
  onClose: () => void;
  onConfirm: (amount: string, token: string) => void;
}

export function FeeModal({
  isOpen,
  initialAmount,
  initialToken,
  onClose,
  onConfirm,
}: FeeModalProps) {
  const [amount, setAmount] = useState(initialAmount || "5.00");
  const [token, setToken] = useState(initialToken || "MON");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid stake amount greater than 0");
      return;
    }
    setError("");
    onConfirm(amount, token);
    onClose();
  };

  return (
    <div className="pactum-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="feeModalTitle">
      <div className="pactum-modal-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 id="feeModalTitle" style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--color-text)" }}>
            Set Entry Fee
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 18px", lineHeight: 1.5 }}>
          Specify the commitment stake required for each participant to join this pool.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
            Stake Amount
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--color-border)",
              fontSize: 16,
              fontWeight: 700,
              boxSizing: "border-box",
            }}
            id="entryFeeAmountInput"
            placeholder="e.g. 5.00"
          />
          {error && <span style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 4, display: "block" }}>{error}</span>}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
            Token Currency
          </label>
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--color-border)",
              fontSize: 14,
              boxSizing: "border-box",
              background: "#fff",
            }}
            id="entryFeeTokenSelect"
          >
            <option value="MON">MON (Monad Testnet Native)</option>
            <option value="DemoUSD">DemoUSD (Accountability Escrow)</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="pactum-btn-secondary" id="feeModalCancelBtn">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="pactum-btn-primary" id="feeModalConfirmBtn">
            <Check size={16} />
            <span>Confirm Fee</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeeModal;
