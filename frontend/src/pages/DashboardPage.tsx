import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Compass, ExternalLink } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import ChallengeStats from "../components/challenges/ChallengeStats";
import ChallengeCard from "../components/challenges/ChallengeCard";
import { pactumApi, pactumRealtime } from "../services/apiClient";
import { useUserSync } from "../hooks/useUserSync";
import type { Challenge, DashboardStats } from "../types/pactum";

export function DashboardPage() {
  const { backendUser } = useUserSync();
  const [stats, setStats] = useState<DashboardStats>({
    activeChallenges: 0,
    totalEarnings: "0.00 MON",
    currentStreak: 0,
  });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, challengesRes] = await Promise.all([
        pactumApi.getDashboardStats(),
        pactumApi.listChallenges({ limit: 50 }),
      ]);
      setStats(statsRes);
      setChallenges(challengesRes.items || (Array.isArray(challengesRes) ? challengesRes : []));
    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
      setError(err?.message || "Failed to load challenges from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    // Listen to real-time events for instant dashboard sync
    const unsubscribe = pactumRealtime.subscribe(({ type }) => {
      if (type.startsWith("challenge.") || type.startsWith("submission.")) {
        void loadData();
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredChallenges = challenges.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      {/* 3 Primary Statistics Cards */}
      <ChallengeStats stats={stats} loading={loading} />

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
          id="dashboardErrorNotice"
        >
          <div>
            <strong>Backend Connection Notice:</strong> {error}
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="pactum-btn-secondary"
            style={{ padding: "4px 10px", fontSize: 12 }}
            id="dashboardRetryBtn"
          >
            Retry
          </button>
        </div>
      )}

      {/* Action Header & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", color: "var(--color-text)", letterSpacing: "-0.03em" }}>
            Your Challenges
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            {backendUser?.displayName ? `Welcome, ${backendUser.displayName}. ` : ""}Active and joined habit accountability pools
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/faucet" className="pactum-btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} id="dashboardGetMonCta">
            <ExternalLink size={15} />
            <span>Get Testnet MON</span>
          </Link>

          <Link to="/challenges" className="pactum-btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} id="exploreChallengesCta">
            <Compass size={15} />
            <span>Explore</span>
          </Link>

          <Link to="/challenges/create" className="pactum-btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} id="createChallengeTopBtn">
            <Plus size={16} />
            <span>Create</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={16} color="var(--color-text-muted)" style={{ position: "absolute", left: 14, top: 14 }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search challenges by topic (e.g. DSA, Reading) or name..."
          style={{
            width: "100%",
            padding: "12px 14px 12px 40px",
            borderRadius: "var(--radius-button)",
            border: "1px solid var(--color-border)",
            background: "#fff",
            fontSize: 14,
            boxSizing: "border-box",
          }}
          id="searchChallengesInput"
        />
      </div>

      {/* Topic-based Challenge List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-muted)" }}>
          <div className="spinner" style={{ width: 22, height: 22, marginBottom: 10 }} />
          <div>Loading your commitments…</div>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="pactum-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: "var(--color-text)" }}>
            No challenges found
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 18px" }}>
            {search ? "No challenges match your search filter." : "You haven't created or joined any challenges yet."}
          </p>
          <Link to="/challenges/create" className="pactum-btn-primary" id="emptyCreateBtn">
            <Plus size={16} />
            <span>Create Your First Challenge</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {filteredChallenges.map((challenge) => (
            <ChallengeCard key={challenge._id} challenge={challenge} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

export default DashboardPage;
