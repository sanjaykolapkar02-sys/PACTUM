import { Flame, Trophy, Coins } from "lucide-react";
import type { DashboardStats } from "../../types/pactum";

interface ChallengeStatsProps {
  stats: DashboardStats;
  loading?: boolean;
}

export function ChallengeStats({ stats, loading }: ChallengeStatsProps) {
  return (
    <div className="pactum-stats-grid" aria-label="Dashboard Statistics">
      <div className="pactum-stat-card" id="statActiveChallenges">
        <div className="pactum-stat-label">
          <Flame size={15} color="var(--color-primary-dark)" />
          <span>Active Challenges</span>
        </div>
        <div className="pactum-stat-value">
          {loading ? "..." : String(stats.activeChallenges).padStart(2, "0")}
        </div>
        <div className="pactum-stat-note">Ongoing commitments</div>
      </div>

      <div className="pactum-stat-card" id="statTotalEarnings">
        <div className="pactum-stat-label">
          <Coins size={15} color="var(--color-success)" />
          <span>Total Earnings</span>
        </div>
        <div className="pactum-stat-value">
          {loading ? "..." : stats.totalEarnings}
        </div>
        <div className="pactum-stat-note">Verified completed pools</div>
      </div>

      <div className="pactum-stat-card" id="statCurrentStreak">
        <div className="pactum-stat-label">
          <Trophy size={15} color="var(--color-warning)" />
          <span>Current Streak</span>
        </div>
        <div className="pactum-stat-value">
          {loading ? "..." : `${stats.currentStreak} Days`}
        </div>
        <div className="pactum-stat-note">Consecutive valid days</div>
      </div>
    </div>
  );
}

export default ChallengeStats;
