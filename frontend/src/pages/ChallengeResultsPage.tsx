import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Trophy, CheckCircle2, XCircle, Clock, ShieldCheck, Sparkles } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { pactumApi } from "../services/apiClient";
import type { Challenge } from "../types/pactum";

export function ChallengeResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await pactumApi.getChallenge(id);
        setChallenge(data);
      } catch (err) {
        console.error("Error loading challenge results:", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-muted)" }}>
          <div className="spinner" style={{ width: 24, height: 24, marginBottom: 12 }} />
          <div>Calculating pool results…</div>
        </div>
      </AppLayout>
    );
  }

  if (!challenge) {
    return (
      <AppLayout>
        <div className="pactum-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h2>Challenge Not Found</h2>
          <button type="button" onClick={() => navigate("/dashboard")} className="pactum-btn-primary">
            Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => navigate(`/challenges/${challenge._id}/room`)}
          className="pactum-btn-secondary"
          style={{ marginBottom: 16, padding: "6px 12px", fontSize: 12 }}
        >
          <ArrowLeft size={14} />
          <span>Back to Workspace</span>
        </button>

        {/* Results Banner */}
        <div className="pactum-card" style={{ textAlign: "center", padding: "32px 24px", background: "var(--gradient-card)" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Trophy size={30} />
          </div>

          <span className="pactum-topic-pill">{challenge.category}</span>

          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "8px 0 6px", color: "var(--color-text)" }}>
            Challenge Completed
          </h1>

          <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "0 0 24px" }}>
            {challenge.title}
          </p>

          {/* Breakdown cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            <div style={{ background: "#e6f9f0", borderRadius: 12, padding: "14px 10px" }}>
              <CheckCircle2 size={18} color="var(--color-success)" style={{ margin: "0 auto 4px" }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-success)" }}>5</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-success)", textTransform: "uppercase" }}>Approved</div>
            </div>

            <div style={{ background: "#fce8ea", borderRadius: 12, padding: "14px 10px" }}>
              <XCircle size={18} color="var(--color-danger)" style={{ margin: "0 auto 4px" }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-danger)" }}>1</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-danger)", textTransform: "uppercase" }}>Rejected</div>
            </div>

            <div style={{ background: "#fef5e7", borderRadius: 12, padding: "14px 10px" }}>
              <Clock size={18} color="var(--color-warning)" style={{ margin: "0 auto 4px" }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-warning)" }}>1</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-warning)", textTransform: "uppercase" }}>Missed</div>
            </div>
          </div>

          {/* Settlement Status */}
          <div style={{ background: "var(--color-primary-soft)", borderRadius: 14, padding: "16px 20px", textAlign: "left", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--color-primary-dark)", marginBottom: 4 }}>
              <ShieldCheck size={16} />
              <span>Financial Settlement Status</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Pool Escrow: <strong>Awaiting contract confirmation</strong> · Funds will be redistributed according to smart contract rules upon final block consensus.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link to="/dashboard" className="pactum-btn-primary">
              <Sparkles size={16} />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default ChallengeResultsPage;
