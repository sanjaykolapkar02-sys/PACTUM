import { useState } from "react";
import { X, CheckCircle, XCircle, Clock, ExternalLink, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { custom, createWalletClient, parseEther, isAddress, type Hex } from "viem";
import { useCommitmentWallet } from "../../hooks/useCommitmentWallet";
import { monadTestnet } from "../../providers/PrivyProvider";
import { MONAD_TESTNET } from "../../config/monad";
import { waitForTransactionConfirmation, getExplorerTxUrl, shortAddress } from "../../services/monadRpc";
import { commitmentPoolAddress } from "../../config/contract";

export type TransactionStatus =
  | "idle"
  | "awaiting_wallet_approval"
  | "broadcasted"
  | "confirmed"
  | "failed"
  | "rejected";

export interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  recipientAddress?: `0x${string}` | null;
  amountMon?: string;
  callData?: Hex;
  isContractCall?: boolean;
  onSuccess?: (txHash: string) => void;
}

export function ManualTransactionModal({
  isOpen,
  onClose,
  title,
  description,
  recipientAddress,
  amountMon = "0.00",
  callData = "0x",
  isContractCall = false,
  onSuccess,
}: ManualTransactionModalProps) {
  const { wallet, address } = useCommitmentWallet();

  const [status, setStatus] = useState<TransactionStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Determine actual target address
  const targetAddress = recipientAddress ?? (isContractCall ? commitmentPoolAddress : null);
  const isTargetMissing = isContractCall && !targetAddress;

  const handleApprove = async () => {
    if (!wallet || !address) {
      setErrorMessage("No active wallet connected. Please log in with Privy first.");
      setStatus("failed");
      return;
    }

    if (!targetAddress || !isAddress(targetAddress)) {
      setErrorMessage("Invalid or unconfigured destination address. Deployed contract address is required.");
      setStatus("failed");
      return;
    }

    try {
      setErrorMessage(null);
      setStatus("awaiting_wallet_approval");

      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(provider),
      });

      const valueWei = amountMon && amountMon !== "0.00" && amountMon !== "0"
        ? parseEther(amountMon)
        : 0n;

      // Prompt user for signature/approval through connected wallet
      const hash = await walletClient.sendTransaction({
        account: address,
        to: targetAddress,
        value: valueWei,
        data: callData,
      } as any);

      setTxHash(hash);
      setStatus("broadcasted");

      // Verify transaction on-chain via Monad Testnet RPC
      const receipt = await waitForTransactionConfirmation(hash);

      if (receipt.isSuccess) {
        setStatus("confirmed");
        setBlockNumber(receipt.blockNumber);
        onSuccess?.(hash);
      } else {
        setStatus("failed");
        setErrorMessage("Transaction was reverted on Monad Testnet.");
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.toLowerCase().includes("user rejected") ||
        msg.toLowerCase().includes("user denied") ||
        msg.toLowerCase().includes("cancelled")
      ) {
        setStatus("rejected");
        setErrorMessage("Transaction was rejected in your wallet.");
      } else {
        setStatus("failed");
        setErrorMessage(msg);
      }
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setTxHash(null);
    setBlockNumber(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      className="pactum-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manualTxTitle"
      style={{ zIndex: 9999 }}
    >
      <div className="pactum-modal-box" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={20} color="var(--color-primary)" />
            <h2 id="manualTxTitle" style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--color-text)" }}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleReset}
            style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
          {description}
        </p>

        {/* Missing Contract Address Warning */}
        {isTargetMissing && (
          <div
            className="notice warning"
            role="alert"
            style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Contract Address Required:</strong> The CommitmentPool smart contract has not been configured with a deployed address on Monad Testnet. To execute this transaction, set <code>VITE_COMMITMENT_POOL_CONTRACT_ADDRESS</code> in <code>frontend/.env</code>.
            </div>
          </div>
        )}

        {/* Transaction Summary Card */}
        <div
          style={{
            background: "#f8fbfe",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 18,
            fontSize: 13,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Network</span>
            <span style={{ fontWeight: 700, color: "var(--color-text)" }}>
              {MONAD_TESTNET.name} ({MONAD_TESTNET.chainId})
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>From (Your Wallet)</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-text)" }}>
              {address ? shortAddress(address) : "Not connected"}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
              {isContractCall ? "Contract Target" : "Recipient Target"}
            </span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-text)" }}>
              {targetAddress ? shortAddress(targetAddress) : "Unconfigured"}
            </span>
          </div>

          {amountMon && amountMon !== "0.00" && (
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
              <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Amount</span>
              <span style={{ fontWeight: 800, color: "var(--color-primary-dark)" }}>
                {amountMon} MON
              </span>
            </div>
          )}
        </div>

        {/* State Banners */}
        {status === "awaiting_wallet_approval" && (
          <div
            className="notice info"
            role="status"
            style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}
          >
            <Clock size={18} />
            <span><strong>Awaiting Confirmation:</strong> Please review and approve this transaction in your connected wallet popup...</span>
          </div>
        )}

        {status === "broadcasted" && (
          <div
            className="notice info"
            role="status"
            style={{ marginBottom: 16, display: "grid", gap: 6 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="spinner" style={{ width: 14, height: 14 }} />
              <strong>Transaction Broadcast:</strong> Awaiting block confirmation on Monad Testnet...
            </div>
            {txHash && (
              <a
                href={getExplorerTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: "var(--color-primary)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <span>View on Monad Explorer ({shortAddress(txHash)})</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}

        {status === "confirmed" && (
          <div
            className="notice success"
            role="status"
            style={{ marginBottom: 16, display: "grid", gap: 6 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={18} color="var(--color-success)" />
              <strong>Transaction Verified:</strong> Confirmed on-chain {blockNumber ? `at block #${blockNumber}` : ""}.
            </div>
            {txHash && (
              <a
                href={getExplorerTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: "var(--color-success)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <span>View Receipt on Monad Explorer</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}

        {(status === "failed" || status === "rejected") && (
          <div
            className="notice error"
            role="alert"
            style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}
          >
            <XCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>{status === "rejected" ? "User Rejected:" : "Transaction Error:"}</strong>{" "}
              {errorMessage || "An error occurred during transaction execution."}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {status === "idle" && (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="pactum-btn-secondary"
                id="manualTxRejectBtn"
              >
                Cancel / Reject
              </button>
              <button
                type="button"
                onClick={() => void handleApprove()}
                disabled={isTargetMissing || !address}
                className="pactum-btn-primary"
                id="manualTxApproveBtn"
              >
                <span>Approve in Wallet</span>
                <ArrowRight size={14} />
              </button>
            </>
          )}

          {status === "awaiting_wallet_approval" && (
            <button
              type="button"
              disabled
              className="pactum-btn-secondary"
            >
              Waiting for wallet...
            </button>
          )}

          {status === "broadcasted" && (
            <button
              type="button"
              disabled
              className="pactum-btn-secondary"
            >
              Confirming on Monad...
            </button>
          )}

          {(status === "confirmed" || status === "failed" || status === "rejected") && (
            <button
              type="button"
              onClick={handleReset}
              className="pactum-btn-primary"
              id="manualTxCloseBtn"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManualTransactionModal;
