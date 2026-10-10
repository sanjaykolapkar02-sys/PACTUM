import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Compass, Plus } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import ChallengeCard from "../components/challenges/ChallengeCard";
import { pactumApi } from "../services/apiClient";
import type { Challenge } from "../types/pactum";

export function BrowseChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await pactumApi.listChallenges({
          status: statusFilter === "all" ? undefined : statusFilter,
          category: search || undefined,
        });
        setChallenges(data.items || (Array.isArray(data) ? data : []));
      } catch (err) {
        console.error("Error browsing challenges:", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [statusFilter, search]);

  return (
    <AppLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "var(--color-text)", letterSpacing: "-0.03em" }}>
            Explore Challenges
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Discover accountability pools across custom topics and join peers.
          </p>
        </div>

        <Link to="/challenges/create" className="pactum-btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
          <Plus size={16} />
          <span>New Challenge</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={16} color="var(--color-text-muted)" style={{ position: "absolute", left: 14, top: 14 }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by topic or challenge name..."
          style={{
            width: "100%",
            padding: "12px 14px 12px 40px",
            borderRadius: "var(--radius-button)",
            border: "1px solid var(--color-border)",
            background: "#fff",
            fontSize: 14,
            boxSizing: "border-box",
          }}
          id="browseSearchInput"
        />
      </div>

      {/* Status Filter Pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all", "active", "upcoming"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: statusFilter === filter ? "var(--color-primary-dark)" : "var(--color-border)",
              background: statusFilter === filter ? "var(--color-primary-soft)" : "#fff",
              color: statusFilter === filter ? "var(--color-primary-dark)" : "var(--color-text)",
              fontWeight: statusFilter === filter ? 700 : 500,
              fontSize: 12,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {filter === "all" ? "All Pools" : filter === "active" ? "Open & Active" : "Upcoming"}
          </button>
        ))}
      </div>

      {/* Challenges Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-muted)" }}>
          <div className="spinner" style={{ width: 22, height: 22, marginBottom: 10 }} />
          <div>Discovering pools…</div>
        </div>
      ) : challenges.length === 0 ? (
        <div className="pactum-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <Compass size={32} color="var(--color-primary-dark)" style={{ margin: "0 auto 10px" }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "var(--color-text)" }}>
            No challenges matching filters
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 16px" }}>
            Try adjusting your search query or start a new challenge pool.
          </p>
          <Link to="/challenges/create" className="pactum-btn-primary">
            Create Challenge
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {challenges.map((c) => (
            <ChallengeCard key={c._id} challenge={c} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

export default BrowseChallengesPage;
