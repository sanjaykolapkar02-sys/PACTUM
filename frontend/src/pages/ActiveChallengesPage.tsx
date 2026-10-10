import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Flame, ArrowRight, Clock } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { pactumApi } from "../services/apiClient";
import { useCommitmentWallet } from "../hooks/useCommitmentWallet";
import type { Challenge } from "../types/pactum";

export function ActiveChallengesPage() {
  const { address } = useCommitmentWallet();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pactumApi.listChallenges({ status: "active" });
      const allActive = data.items || (Array.isArray(data) ? data : []);

      if (!address) {
        // User has no connected wallet or active enrolled commitments
        setChallenges([]);
        return;
      }

      // Filter to only challenges the user has actively joined
      const joinedList: Challenge[] = [];
      for (const ch of allActive) {
        try {
          const parts = await pactumApi.getParticipants(ch._id);
          const isMember = parts.some(
            (p: any) => p.walletAddress && p.walletAddress.toLowerCase() === address.toLowerCase()
          );
          if (isMember) {
            joinedList.push(ch);
          }
        } catch {
          // Continue gracefully
        }
      }
      setChallenges(joinedList);
    } catch (err: any) {
      console.error("Error loading active challenges:", err);
      setError(err?.message || "Failed to load active challenges from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [address]);

  const filtered = challenges.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "var(--color-text)", letterSpacing: "-0.03em" }}>
          Active Challenges
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Track your active habit pools, daily submission windows, and review progress.
        </p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={16} color="var(--color-text-muted)" style={{ position: "absolute", left: 14, top: 14 }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your active challenges..."
          style={{
            width: "100%",
            padding: "12px 14px 12px 40px",
            borderRadius: "var(--radius-button)",
            border: "1px solid var(--color-border)",
            background: "#fff",
            fontSize: 14,
            boxSizing: "border-box",
          }}
          id="searchActiveChallengesInput"
        />
      </div>

      {error && (
        <div
          style={{
            background: "#fce8ea",
            border: "1px solid var(--color-danger)",
            color: "var(--color-danger)",
            padding: "12px 16px",
            borderRadius: "var(--radius-button)",
            marginBottom: 16,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
          role="alert"
          id="activeErrorNotice"
        >
          <div>
            <strong>Notice:</strong> {error}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="pactum-btn-secondary"
            style={{ padding: "4px 10px", fontSize: 12 }}
            id="activeRetryBtn"
          >
            Retry
          </button>
        </div>
      )}

      {error ? null : loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-muted)" }}>
          <div className="spinner" style={{ width: 22, height: 22, marginBottom: 10 }} />
          <div>Loading active challenges…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pactum-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <Flame size={32} color="var(--color-primary-dark)" style={{ margin: "0 auto 10px" }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "var(--color-text)" }}>
            No Active Commitments
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 16px" }}>
            Join an existing accountability pool or create your own challenge.
          </p>
          <Link to="/challenges" className="pactum-btn-primary">
            Explore Open Pools
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((c) => {
            const elapsedDays = c.startAt
              ? Math.max(1, Math.min(c.duration, Math.ceil((Date.now() - new Date(c.startAt).getTime()) / (1000 * 60 * 60 * 24))))
              : Math.min(c.duration, 3);
            const remainingDays = c.endAt
              ? Math.max(0, Math.ceil((new Date(c.endAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : null;

            return (
              <div key={c._id} className="pactum-card" id={`active-card-${c._id}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span className="pactum-topic-pill">{c.category}</span>
                  <span className="pactum-badge pactum-badge-active">● Active</span>
                </div>

                <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px", color: "var(--color-text)" }}>
                  {c.title}
                </h3>

                <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  {c.description}
                </p>

                {/* Progress bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    <span style={{ color: "var(--color-text)" }}>Progress</span>
                    <span style={{ color: "var(--color-primary-dark)" }}>
                      {elapsedDays} / {c.duration} days
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "var(--color-border)", borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, (elapsedDays / c.duration) * 100)}%`,
                        height: "100%",
                        background: "var(--gradient-primary)",
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={13} />
                    <span>
                      {remainingDays !== null ? `${remainingDays}d remaining` : `Next: ${c.dailyDeadline || "10:00 PM"}`}
                    </span>
                  </div>

                  <Link
                    to={`/challenges/${c._id}/room`}
                    className="pactum-btn-primary"
                    style={{ padding: "8px 14px", fontSize: 12 }}
                    id={`openChallengeBtn-${c._id}`}
                  >
                    <span>Open Challenge</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

export default ActiveChallengesPage;
