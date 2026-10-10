export type ChallengeStatus = "draft" | "open" | "active" | "upcoming" | "voting" | "completed" | "cancelled";

export interface Challenge {
  _id: string;
  title: string;
  description: string;
  category: string; // User-defined topic (e.g. "DSA", "Reading", "Fitness")
  duration: number; // in days
  startAt: string;
  endAt: string;
  stakeAmount: string; // Base-unit string (e.g. "5000000000000000000" or wei)
  tokenSymbol?: string;
  creatorId: string;
  creatorWallet?: string;
  status: ChallengeStatus;
  maximumParticipants?: number;
  participantCount?: number;
  imageUrl?: string | null;
  // Extended form details
  specificRules?: string;
  submissionRules?: string;
  submissionSchedule?: string;
  dailyDeadline?: string;
  createdAt?: string;
}

export interface Participant {
  _id: string;
  challengeId: string;
  userId: string;
  walletAddress: string;
  displayName?: string;
  joinedAt: string;
  status: "active" | "completed" | "dropped";
  submissionCount?: number;
  todayStatus?: "not_submitted" | "pending_review" | "approved" | "rejected" | "missed";
  lastSubmissionAt?: string;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  _id: string;
  challengeId: string;
  participantId: string;
  userId: string;
  submitterName?: string;
  submitterWallet?: string;
  evidenceUrl: string;
  note?: string;
  submittedAt: string;
  status: SubmissionStatus;
  approvalsCount: number;
  rejectionsCount: number;
  pendingCount: number;
  userVoted?: "approve" | "reject" | null;
}

export interface Vote {
  _id: string;
  submissionId: string;
  challengeId?: string;
  voterId: string;
  voterWallet?: string;
  vote: "approve" | "reject";
  comment?: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  challengeId: string;
  senderId: string;
  senderName: string;
  senderWallet: string;
  content: string;
  timestamp: string;
  isSelf?: boolean;
}

export interface DashboardStats {
  activeChallenges: number;
  totalEarnings: string;
  currentStreak: number;
}
