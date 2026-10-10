import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCommitmentWallet } from "../hooks/useCommitmentWallet";
import { ArrowLeft, Clock, Users, Calendar, ShieldCheck, ArrowRight } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { pactumApi } from "../services/apiClient";
import type { Challenge } from "../types/pactum";

export function ChallengeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address } = useCommitmentWallet();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await pactumApi.getChallenge(id);
        setChallenge(data);
      } catch (err) {
        console.error("Error loading challenge details:", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  const handleJoin = async () => {
    if (!id || !challenge) return;

    if (challenge.maximumParticipants && (challenge.participantCount || 0) >= challenge.maximumParticipants) {
      setError("This challenge pool has reached maximum participant capacity.");
      return;
    }

    try {
      setJoining(true);
      setError("");
      await pactumApi.joinChallenge(id, address || undefined);
      setHasJoined(true);
      navigate(`/challenges/${id}/room`);
    } catch (err: any) {
      setError(err?.message || "Failed to join challenge. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-muted)" }}>
          <div className="spinner" style={{ width: 24, height: 24, marginBottom: 12 }} />
          <div>Loading challenge details…</div>
        </div>
      </AppLayout>
    );
  }

  if (!challenge) {
    return (
      <AppLayout>
        <div className="pactum-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h2>Challenge Not Found</h2>
          <p style={{ color: "var(--color-text-muted)" }}>The challenge you requested does not exist.</p>
          <button type="button" onClick={() => navigate("/dashboard")} className="pactum-btn-primary">
            Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  const isFull =
    Boolean(challenge.maximumParticipants && (challenge.participantCount || 0) >= challenge.maximumParticipants);

  return (
    <AppLayout>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="pactum-btn-secondary"
          style={{ marginBottom: 16, padding: "6px 12px", fontSize: 12 }}
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        {/* 4 Prominent Details Card */}
        <div className="pactum-card" style={{ borderTop: "4px solid var(--color-primary)", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <span className="pactum-topic-pill">{challenge.category}</span>
            <span className="pactum-badge pactum-badge-active">● {challenge.status}</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", color: "var(--color-text)", letterSpacing: "-0.03em" }}>
            {challenge.title}
          </h1>

          <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "0 0 20px", lineHeight: 1.6 }}>
            {challenge.description}
          </p>

          {/* 4 Prominent Details Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 12,
              background: "var(--color-primary-soft)",
              padding: 16,
              borderRadius: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                1. Duration
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-primary-dark)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={16} /> {challenge.duration} Days
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                2. Participants
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-primary-dark)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <Users size={16} /> {challenge.participantCount || 0} / {challenge.maximumParticipants || 15}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                3. Entry Stake
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-success)", marginTop: 2 }}>
                5.00 {challenge.tokenSymbol || "MON"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                4. Schedule
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <Calendar size={14} /> {challenge.dailyDeadline || "10:00 PM"}
              </div>
            </div>
          </div>
        </div>

        {/* Rules & Expectations */}
        <div className="pactum-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px", color: "var(--color-text)" }}>
            Rules & Submission Requirements
          </h2>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary-dark)", marginBottom: 4 }}>
              Specific Rules
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text)", background: "#f8fbfe", padding: 12, borderRadius: 10, border: "1px solid var(--color-border)" }}>
              {challenge.specificRules || "Complete daily tasks independently. Peer reviews are enforced."}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary-dark)", marginBottom: 4 }}>
              Submission Windows
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text)", background: "#f8fbfe", padding: 12, borderRadius: 10, border: "1px solid var(--color-border)" }}>
              {challenge.submissionSchedule || "Daily Windows: 08:00 AM – 10:00 AM and 09:00 PM – 10:00 PM"}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fce8ea", color: "var(--color-danger)", padding: "12px 16px", borderRadius: 12, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Join CTA */}
        <div className="pactum-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>Ready to commit?</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>
              {isFull ? "Pool Capacity Reached (15/15)" : "Join before the start window closes"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link
              to={`/challenges/${challenge._id}/room`}
              className="pactum-btn-secondary"
              id="viewWorkspaceBtn"
            >
              <span>View Workspace</span>
              <ArrowRight size={14} />
            </Link>

            <button
              type="button"
              disabled={joining || isFull || hasJoined}
              onClick={handleJoin}
              className="pactum-btn-primary"
              id="joinChallengeBtn"
            >
              <ShieldCheck size={16} />
              <span>{hasJoined ? "Joined!" : joining ? "Joining…" : "Join Challenge"}</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default ChallengeDetailsPage;
