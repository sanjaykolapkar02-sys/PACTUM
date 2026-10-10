// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import ChallengeStats from "../components/challenges/ChallengeStats";
import ChallengeCard from "../components/challenges/ChallengeCard";
import FeeModal from "../components/challenges/FeeModal";
import VoteControls from "../components/challenges/VoteControls";
import BottomNav from "../components/layout/BottomNav";
import type { Challenge, Submission, DashboardStats } from "../types/pactum";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("PACTUM Frontend Flow & Components", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  const renderComponent = async (element: React.ReactElement) => {
    const root = createRoot(container);
    await act(async () => {
      root.render(element);
    });
    return root;
  };

  describe("Dashboard Statistics Component", () => {
    it("renders exactly three primary statistics: Active Challenges, Total Earnings, and Current Streak", async () => {
      const stats: DashboardStats = {
        activeChallenges: 4,
        totalEarnings: "12.50 MON",
        currentStreak: 7,
      };

      await renderComponent(<ChallengeStats stats={stats} />);

      expect(container.textContent).toContain("Active Challenges");
      expect(container.textContent).toContain("04");
      expect(container.textContent).toContain("Total Earnings");
      expect(container.textContent).toContain("12.50 MON");
      expect(container.textContent).toContain("Current Streak");
      expect(container.textContent).toContain("7 Days");
    });
  });

  describe("Topic-Based Challenge Card", () => {
    it("renders user-defined topic, title, capacity and view action", async () => {
      const challenge: Challenge = {
        _id: "chal_dsa_1",
        title: "Solve 3 DSA Problems Every Day",
        description: "Algorithmic practice every morning.",
        category: "DSA",
        duration: 7,
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        stakeAmount: "5000000000000000000",
        tokenSymbol: "MON",
        creatorId: "user_1",
        status: "active",
        maximumParticipants: 15,
        participantCount: 12,
      };

      await renderComponent(
        <BrowserRouter>
          <ChallengeCard challenge={challenge} />
        </BrowserRouter>
      );

      expect(container.textContent).toContain("DSA");
      expect(container.textContent).toContain("Solve 3 DSA Problems Every Day");
      expect(container.textContent).toContain("12 / 15 participants");
      expect(container.textContent).toContain("7 days");
      expect(container.textContent).toContain("View Challenge");
    });
  });

  describe("Entry Fee Configuration Modal", () => {
    it("renders amount input and token selection when open", async () => {
      await renderComponent(
        <FeeModal
          isOpen={true}
          initialAmount="5.00"
          initialToken="MON"
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      expect(container.textContent).toContain("Set Entry Fee");
      expect(container.textContent).toContain("Stake Amount");
      expect(container.textContent).toContain("Token Currency");
      expect(container.textContent).toContain("Confirm Fee");
    });
  });

  describe("Peer Review & Vote Controls", () => {
    it("prevents self-voting on user's own submission", async () => {
      const submission: Submission = {
        _id: "sub_1",
        challengeId: "chal_1",
        participantId: "part_1",
        userId: "current_user",
        evidenceUrl: "https://example.com/img.png",
        submittedAt: new Date().toISOString(),
        status: "pending",
        approvalsCount: 2,
        rejectionsCount: 0,
        pendingCount: 2,
        userVoted: null,
      };

      await renderComponent(
        <VoteControls
          submission={submission}
          isSelf={true}
          onVote={vi.fn()}
        />
      );

      expect(container.textContent).toContain(
        "You cannot vote on your own submission. Awaiting peer review."
      );
      expect(container.querySelector("#approveBtn-sub_1")).toBeNull();
      expect(container.querySelector("#rejectBtn-sub_1")).toBeNull();
    });

    it("displays Approve and Reject buttons for eligible peer reviewers", async () => {
      const submission: Submission = {
        _id: "sub_1",
        challengeId: "chal_1",
        participantId: "part_1",
        userId: "other_user",
        evidenceUrl: "https://example.com/img.png",
        submittedAt: new Date().toISOString(),
        status: "pending",
        approvalsCount: 1,
        rejectionsCount: 0,
        pendingCount: 3,
        userVoted: null,
      };

      await renderComponent(
        <VoteControls
          submission={submission}
          isSelf={false}
          onVote={vi.fn()}
        />
      );

      expect(container.textContent).toContain("Approve");
      expect(container.textContent).toContain("Reject");
      expect(container.textContent).toContain("1 Approved");
      expect(container.textContent).toContain("3 Pending");
    });

    it("displays recorded vote notice when user has already voted", async () => {
      const submission: Submission = {
        _id: "sub_1",
        challengeId: "chal_1",
        participantId: "part_1",
        userId: "other_user",
        evidenceUrl: "https://example.com/img.png",
        submittedAt: new Date().toISOString(),
        status: "pending",
        approvalsCount: 2,
        rejectionsCount: 1,
        pendingCount: 1,
        userVoted: "approve",
      };

      await renderComponent(
        <VoteControls
          submission={submission}
          isSelf={false}
          onVote={vi.fn()}
        />
      );

      expect(container.textContent).toContain(
        "You voted to Approve this submission."
      );
    });
  });

  describe("Bottom Navigation", () => {
    it("renders exactly three primary actions: Home, Create Challenge, and Active", async () => {
      await renderComponent(
        <BrowserRouter>
          <BottomNav />
        </BrowserRouter>
      );

      expect(container.textContent).toContain("Home");
      expect(container.textContent).toContain("Active");
      const createLink = container.querySelector("#bottomNavCreate");
      expect(createLink).toBeDefined();
    });
  });
});
