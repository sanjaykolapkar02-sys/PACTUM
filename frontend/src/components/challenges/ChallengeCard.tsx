import { Link } from "react-router-dom";
import { Users, Clock, ArrowRight } from "lucide-react";
import type { Challenge } from "../../types/pactum";

interface ChallengeCardProps {
  challenge: Challenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const statusBadgeClass =
    challenge.status === "active"
      ? "pactum-badge-active"
      : challenge.status === "open"
      ? "pactum-badge-pending"
      : challenge.status === "upcoming"
      ? "pactum-badge-pending"
      : "pactum-badge-closed";

  const statusLabel =
    challenge.status === "active"
      ? "Active"
      : challenge.status === "open"
      ? "Open"
      : challenge.status === "upcoming"
      ? "Upcoming"
      : "Completed";

  const formattedFee = (() => {
    try {
      if (!challenge.stakeAmount) return "0.1";
      const val = BigInt(challenge.stakeAmount);
      const mon = Number(val) / 1e18;
      return mon >= 0.01 ? mon.toString() : "0.05";
    } catch {
      return "0.1";
    }
  })();

  return (
    <div className="pactum-card" id={`challenge-card-${challenge._id}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span className="pactum-topic-pill">{challenge.category}</span>
        <span className={`pactum-badge ${statusBadgeClass}`}>● {statusLabel}</span>
      </div>

      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px", color: "var(--color-text)" }}>
        {challenge.title}
      </h3>

      <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
        {challenge.description}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--color-text-muted)", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Users size={14} color="var(--color-primary-dark)" />
          <span>
            {challenge.participantCount || 0} / {challenge.maximumParticipants || 15} participants
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Clock size={14} color="var(--color-primary-dark)" />
          <span>{challenge.duration} days</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary-dark)" }}>
          {formattedFee} {challenge.tokenSymbol || "MON"} Entry
        </span>

        <Link
          to={`/challenges/${challenge._id}`}
          className="pactum-btn-secondary"
          style={{ padding: "6px 14px", fontSize: 12 }}
          id={`viewChallengeBtn-${challenge._id}`}
        >
          <span>View Challenge</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export default ChallengeCard;
