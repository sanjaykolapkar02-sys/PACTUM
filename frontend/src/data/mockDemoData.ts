import type { Challenge, Participant, Submission, ChatMessage, DashboardStats } from "../types/pactum";

export interface DemoLeaderboardEntry {
  rank: number;
  name: string;
  walletAddress: string;
  daysCompleted: number;
  totalDays: number;
  percentage: number;
  streak: number;
  status: "verified" | "pending" | "needs_review";
  projectedReward: string;
  isCurrentUser?: boolean;
}

export const DEMO_CHALLENGES: Challenge[] = [
  {
    _id: "demo-10k-steps",
    title: "10,000 Daily Steps Challenge",
    category: "Health & Fitness",
    duration: 7,
    startAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    stakeAmount: "100000000000000000", // 0.10 MON
    tokenSymbol: "MON",
    creatorId: "user_ravikant",
    creatorWallet: "0x71a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8b49c",
    status: "active",
    maximumParticipants: 15,
    participantCount: 3,
    dailyDeadline: "10:00 PM",
    description:
      "Hit 10,000 steps every day for 7 consecutive days. Submit pedometer or smartwatch daily summary showing step count and date.",
    specificRules:
      "1. Minimum 10,000 intentional steps daily.\n2. Submit health app (Apple Health, Google Fit, Fitbit) or smartwatch screenshot before 10:00 PM.\n3. Verified by peer consensus (2 approvals required).\n4. All stakes pooled into the smart contract escrow.",
    submissionRules:
      "Upload a clear screenshot showing step count exceeding 10,000 with timestamp.",
    submissionSchedule: "Daily Window: 06:00 AM – 10:00 PM UTC",
    imageUrl:
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80",
  },
  {
    _id: "demo-screen-time",
    title: "Maximum 3 Hours Daily Screen Time",
    category: "Screen Time",
    duration: 7,
    startAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    stakeAmount: "50000000000000000", // 0.05 MON
    tokenSymbol: "MON",
    creatorId: "user_rishikesh",
    creatorWallet: "0x34d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2e81a",
    status: "active",
    maximumParticipants: 12,
    participantCount: 3,
    dailyDeadline: "09:30 PM",
    description:
      "Keep personal smartphone screen time under 3 hours daily. Reclaim your focus and reduce digital fatigue.",
    specificRules:
      "1. Smartphone screen time must stay under 3h 00m.\n2. Submit daily Digital Wellbeing / Screen Time screenshot before 09:30 PM.\n3. Productivity tools allowed; social media and streaming restricted.",
    submissionRules: "Submit unedited screen time dashboard summary.",
    submissionSchedule: "Daily Window: 08:00 AM – 09:30 PM UTC",
    imageUrl:
      "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80",
  },
  {
    _id: "demo-daily-reading",
    title: "30 Minutes Daily Reading",
    category: "Habits",
    duration: 7,
    startAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    stakeAmount: "50000000000000000", // 0.05 MON
    tokenSymbol: "MON",
    creatorId: "user_kartikey",
    creatorWallet: "0x98f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7c20b",
    status: "active",
    maximumParticipants: 20,
    participantCount: 3,
    dailyDeadline: "10:30 PM",
    description:
      "Read books or educational literature for at least 30 minutes every day. Foster lifelong learning and mental stamina.",
    specificRules:
      "1. Minimum 30 minutes of intentional book reading daily.\n2. Submit photo of open book page with a brief 1-sentence key takeaway.\n3. Audiobooks with chapter progress acceptable.",
    submissionRules: "Photo of reading material with a brief takeaway note.",
    submissionSchedule: "Daily Window: 07:00 AM – 10:30 PM UTC",
    imageUrl:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80",
  },
];

export const DEMO_PARTICIPANTS: Participant[] = [
  {
    _id: "part_ravikant",
    challengeId: "demo-10k-steps",
    userId: "user_ravikant",
    displayName: "Ravikant",
    walletAddress: "0x71a2...b49c",
    joinedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    submissionCount: 6,
    todayStatus: "approved",
  },
  {
    _id: "part_rishikesh",
    challengeId: "demo-10k-steps",
    userId: "user_rishikesh",
    displayName: "Rishikesh",
    walletAddress: "0x34d8...e81a",
    joinedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    submissionCount: 5,
    todayStatus: "approved",
  },
  {
    _id: "part_kartikey",
    challengeId: "demo-10k-steps",
    userId: "user_kartikey",
    displayName: "Kartikey",
    walletAddress: "0x98f1...c20b",
    joinedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    submissionCount: 4,
    todayStatus: "pending_review",
  },
];

export const DEMO_LEADERBOARD: DemoLeaderboardEntry[] = [
  {
    rank: 1,
    name: "Ravikant",
    walletAddress: "0x71a2...b49c",
    daysCompleted: 6,
    totalDays: 7,
    percentage: 86,
    streak: 6,
    status: "verified",
    projectedReward: "0.120 MON",
  },
  {
    rank: 2,
    name: "Rishikesh",
    walletAddress: "0x34d8...e81a",
    daysCompleted: 5,
    totalDays: 7,
    percentage: 71,
    streak: 5,
    status: "verified",
    projectedReward: "0.100 MON",
  },
  {
    rank: 3,
    name: "Kartikey",
    walletAddress: "0x98f1...c20b",
    daysCompleted: 4,
    totalDays: 7,
    percentage: 57,
    streak: 4,
    status: "pending",
    projectedReward: "0.080 MON",
  },
];

export const DEMO_SUBMISSIONS: Submission[] = [
  {
    _id: "sub_demo_ravikant_today",
    challengeId: "demo-10k-steps",
    participantId: "part_ravikant",
    userId: "user_ravikant",
    submitterName: "Ravikant",
    submitterWallet: "0x71a2...b49c",
    evidenceUrl:
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=700&auto=format&fit=crop&q=80",
    note: "Day 4: Completed 11,240 steps on evening brisk walk along the lake. Target met with extra margin!",
    submittedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    status: "approved",
    approvalsCount: 2,
    rejectionsCount: 0,
    pendingCount: 0,
    userVoted: "approve",
  },
  {
    _id: "sub_demo_rishikesh_today",
    challengeId: "demo-10k-steps",
    participantId: "part_rishikesh",
    userId: "user_rishikesh",
    submitterName: "Rishikesh",
    submitterWallet: "0x34d8...e81a",
    evidenceUrl:
      "https://images.unsplash.com/photo-1510519138171-cbe656418844?w=700&auto=format&fit=crop&q=80",
    note: "Day 4: Hit 10,450 steps around campus and treadmill warm-up. Smartwatch summary attached.",
    submittedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    status: "approved",
    approvalsCount: 2,
    rejectionsCount: 0,
    pendingCount: 0,
    userVoted: "approve",
  },
  {
    _id: "sub_demo_kartikey_today",
    challengeId: "demo-10k-steps",
    participantId: "part_kartikey",
    userId: "user_kartikey",
    submitterName: "Kartikey",
    submitterWallet: "0x98f1...c20b",
    evidenceUrl:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=700&auto=format&fit=crop&q=80",
    note: "Day 4: Logged 10,120 steps after evening football practice. Verification pending peer review.",
    submittedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: "pending",
    approvalsCount: 1,
    rejectionsCount: 0,
    pendingCount: 1,
    userVoted: null,
  },
  {
    _id: "sub_demo_kartikey_day2",
    challengeId: "demo-10k-steps",
    participantId: "part_kartikey",
    userId: "user_kartikey",
    submitterName: "Kartikey",
    submitterWallet: "0x98f1...c20b",
    evidenceUrl:
      "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=700&auto=format&fit=crop&q=80",
    note: "Day 2: Logged 4,800 steps due to travel delay. Missed the 10,000 threshold.",
    submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    status: "rejected",
    approvalsCount: 0,
    rejectionsCount: 2,
    pendingCount: 0,
    userVoted: "reject",
  },
];

export const DEMO_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "chat_01",
    challengeId: "demo-10k-steps",
    senderId: "user_ravikant",
    senderName: "Ravikant",
    senderWallet: "0x71a2...b49c",
    content: "Hey everyone! Day 4 of the 10,000 steps challenge. Already at 7,500 steps from my morning jog!",
    timestamp: "09:15 AM",
  },
  {
    id: "chat_02",
    challengeId: "demo-10k-steps",
    senderId: "user_rishikesh",
    senderName: "Rishikesh",
    senderWallet: "0x34d8...e81a",
    content: "Awesome pace Ravikant! I'm heading out for an evening walk right now to cross 10K before 10 PM.",
    timestamp: "10:30 AM",
  },
  {
    id: "chat_03",
    challengeId: "demo-10k-steps",
    senderId: "user_kartikey",
    senderName: "Kartikey",
    senderWallet: "0x98f1...c20b",
    content: "Just uploaded my step counter proof — crossed 10,120 steps! Please review when you can.",
    timestamp: "05:45 PM",
  },
  {
    id: "chat_04",
    challengeId: "demo-10k-steps",
    senderId: "user_ravikant",
    senderName: "Ravikant",
    senderWallet: "0x71a2...b49c",
    content: "Reviewed and approved your submission Kartikey! Strong consistency from all of us today.",
    timestamp: "06:10 PM",
  },
];

export const DEMO_STATS: DashboardStats = {
  activeChallenges: 3,
  totalEarnings: "0.30 MON (Demo Preview)",
  currentStreak: 6,
};
