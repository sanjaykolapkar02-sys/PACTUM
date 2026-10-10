import { useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { Submission } from "../../types/pactum";

interface VoteControlsProps {
  submission: Submission;
  isSelf: boolean;
  onVote: (vote: "approve" | "reject") => Promise<void>;
}

export function VoteControls({ submission, isSelf, onVote }: VoteControlsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVote = async (choice: "approve" | "reject") => {
    if (isSelf || submission.userVoted) return;

    try {
      setLoading(true);
      setError("");
      await onVote(choice);
    } catch (err: any) {
      setError(err?.message || "Failed to record vote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--color-primary-soft)", borderRadius: 12, padding: "12px 14px", marginTop: 12 }}>
      {/* Review Progress Breakdown */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text)" }}>
          Peer Verification
        </div>

        <div style={{ display: "flex", gap: 10, fontSize: 11, fontWeight: 700 }}>
          <span style={{ color: "var(--color-success)", display: "flex", alignItems: "center", gap: 3 }}>
            <CheckCircle2 size={12} /> {submission.approvalsCount} Approved
          </span>
          <span style={{ color: "var(--color-danger)", display: "flex", alignItems: "center", gap: 3 }}>
            <XCircle size={12} /> {submission.rejectionsCount} Rejected
          </span>
          <span style={{ color: "var(--color-warning)", display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={12} /> {submission.pendingCount} Pending
          </span>
        </div>
      </div>

      {/* Action / Status Notice */}
      {isSelf ? (
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontStyle: "italic" }}>
          You cannot vote on your own submission. Awaiting peer review.
        </div>
      ) : submission.userVoted ? (
        <div style={{ fontSize: 12, fontWeight: 700, color: submission.userVoted === "approve" ? "var(--color-success)" : "var(--color-danger)", display: "flex", alignItems: "center", gap: 5 }}>
          {submission.userVoted === "approve" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          <span>You voted to {submission.userVoted === "approve" ? "Approve" : "Reject"} this submission.</span>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleVote("approve")}
              style={{
                flex: 1,
                padding: "8px 12px",
                background: "#e6f9f0",
                color: "var(--color-success)",
                border: "1px solid rgba(35, 134, 107, 0.3)",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
              id={`approveBtn-${submission._id}`}
            >
              <CheckCircle2 size={13} />
              <span>Approve</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleVote("reject")}
              style={{
                flex: 1,
                padding: "8px 12px",
                background: "#fce8ea",
                color: "var(--color-danger)",
                border: "1px solid rgba(195, 79, 88, 0.3)",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
              id={`rejectBtn-${submission._id}`}
            >
              <XCircle size={13} />
              <span>Reject</span>
            </button>
          </div>
          {error && <div style={{ color: "var(--color-danger)", fontSize: 11, marginTop: 6 }}>{error}</div>}
        </div>
      )}
    </div>
  );
}

export default VoteControls;
