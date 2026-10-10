import { connectDatabase, disconnectDatabase, sanitizeMongoUri } from "../config/database";
import { env } from "../config/env";
import UserModel from "../modules/users/user.model";
import ChallengeModel from "../modules/challenges/challenge.model";

export interface SeedChallengeDefinition {
  seedKey: string;
  title: string;
  category: string;
  duration: number; // in days
  stakeAmount: string; // base-units string (wei, 10^18 = 1 MON)
  displayFeeMon: string;
  description: string;
  status: "active" | "open";
  daysStartedAgo: number; // for active challenges, relative to today
  daysUntilEnd: number; // for duration math
  participantCount: number;
  maximumParticipants: number;
  dailyDeadline: string;
  specificRules: string;
  submissionSchedule: string;
}

export const SEED_CHALLENGES: SeedChallengeDefinition[] = [
  // 1. Daily Fitness (Active / Live Challenge)
  {
    seedKey: "seed-fitness-7day-streak",
    title: "7-Day Fitness Streak",
    category: "Fitness",
    duration: 7,
    stakeAmount: "100000000000000000", // 0.10 MON
    displayFeeMon: "0.10 MON",
    description:
      "Complete a daily workout and maintain a consistent fitness routine. Submit a post-workout photo or gym session log every day to verify your commitment.",
    status: "active",
    daysStartedAgo: 3,
    daysUntilEnd: 4,
    participantCount: 8,
    maximumParticipants: 15,
    dailyDeadline: "09:30 PM",
    specificRules:
      "Minimum 30 minutes of intentional exercise (gym workout, running, calisthenics, or cycling). Submit fitness app log or workout selfie.",
    submissionSchedule: "Daily Window: 06:00 AM – 09:30 PM UTC",
  },

  // 2. Daily Reading (Active / Live Challenge)
  {
    seedKey: "seed-learning-read-every-day",
    title: "Read Every Day",
    category: "Learning",
    duration: 7,
    stakeAmount: "50000000000000000", // 0.05 MON
    displayFeeMon: "0.05 MON",
    description:
      "Read for at least 20 minutes every day. Build a lifelong reading habit by diving into books, research papers, or long-form essays daily.",
    status: "active",
    daysStartedAgo: 2,
    daysUntilEnd: 5,
    participantCount: 12,
    maximumParticipants: 20,
    dailyDeadline: "10:00 PM",
    specificRules:
      "Minimum 20 pages or 20 minutes of reading. Submit photo of page with key takeaway or highlighted passage.",
    submissionSchedule: "Daily Window: 08:00 AM – 10:00 PM UTC",
  },

  // 3. Hydration Challenge (Active / Live Challenge)
  {
    seedKey: "seed-health-hydration-habit",
    title: "Hydration Habit",
    category: "Health",
    duration: 7,
    stakeAmount: "50000000000000000", // 0.05 MON
    displayFeeMon: "0.05 MON",
    description:
      "Maintain a consistent daily water-drinking routine. Stay refreshed and hit your daily hydration target (2.5L+) throughout the week.",
    status: "active",
    daysStartedAgo: 1,
    daysUntilEnd: 6,
    participantCount: 6,
    maximumParticipants: 15,
    dailyDeadline: "08:00 PM",
    specificRules:
      "Log 2.5L+ of water daily. Submit photo of filled water bottle or hydration tracker screenshot.",
    submissionSchedule: "Daily Window: 07:00 AM – 08:00 PM UTC",
  },

  // 4. Morning Routine (Open / Upcoming Challenge)
  {
    seedKey: "seed-productivity-early-start",
    title: "Early Start Challenge",
    category: "Productivity",
    duration: 7,
    stakeAmount: "100000000000000000", // 0.10 MON
    displayFeeMon: "0.10 MON",
    description:
      "Complete a predefined morning routine every day. Wake up before 06:30 AM, hydrate, plan your day, and start without screen distractions.",
    status: "open",
    daysStartedAgo: -1, // starts tomorrow
    daysUntilEnd: 7,
    participantCount: 4,
    maximumParticipants: 12,
    dailyDeadline: "07:00 AM",
    specificRules:
      "Check in before 07:00 AM with morning planner or sunrise photo. No snoozing allowed.",
    submissionSchedule: "Morning Window: 05:30 AM – 07:00 AM UTC",
  },

  // 5. Coding Practice (Active / Live Challenge)
  {
    seedKey: "seed-learning-coding-sprint-14d",
    title: "14-Day Coding Sprint",
    category: "Learning",
    duration: 14,
    stakeAmount: "200000000000000000", // 0.20 MON
    displayFeeMon: "0.20 MON",
    description:
      "Practice coding every day and submit proof of progress. Solve a DSA problem, push a Git commit, or build a feature daily.",
    status: "active",
    daysStartedAgo: 5,
    daysUntilEnd: 9,
    participantCount: 14,
    maximumParticipants: 25,
    dailyDeadline: "11:59 PM",
    specificRules:
      "At least 1 LeetCode/Codeforces problem solved or 1 meaningful GitHub commit with diff link.",
    submissionSchedule: "Daily Window: 00:00 – 23:59 UTC",
  },

  // 6. Meditation (Open / Upcoming Challenge)
  {
    seedKey: "seed-wellness-mindful-minutes",
    title: "Mindful Minutes",
    category: "Wellness",
    duration: 7,
    stakeAmount: "50000000000000000", // 0.05 MON
    displayFeeMon: "0.05 MON",
    description:
      "Complete a daily meditation session. Practice mindfulness for at least 10 minutes to reduce stress and improve mental clarity.",
    status: "open",
    daysStartedAgo: -2, // starts in 2 days
    daysUntilEnd: 7,
    participantCount: 5,
    maximumParticipants: 15,
    dailyDeadline: "09:00 PM",
    specificRules:
      "10+ minutes of guided or silent meditation. Submit screenshot from meditation app (Headspace, Calm, Medito, etc.).",
    submissionSchedule: "Daily Window: 06:00 AM – 09:00 PM UTC",
  },

  // 7. Walking (Active / Live Challenge)
  {
    seedKey: "seed-fitness-daily-steps-14d",
    title: "Daily Steps Challenge",
    category: "Fitness",
    duration: 14,
    stakeAmount: "100000000000000000", // 0.10 MON
    displayFeeMon: "0.10 MON",
    description:
      "Maintain a daily walking habit. Reach at least 8,000 steps every day to stay active, burn calories, and improve cardiovascular health.",
    status: "active",
    daysStartedAgo: 4,
    daysUntilEnd: 10,
    participantCount: 10,
    maximumParticipants: 20,
    dailyDeadline: "10:30 PM",
    specificRules:
      "Hit 8,000+ steps. Submit pedometer or smartwatch daily summary showing step count and date.",
    submissionSchedule: "Daily Window: 06:00 AM – 10:30 PM UTC",
  },

  // 8. Screen-Time Discipline (Open / Upcoming Challenge)
  {
    seedKey: "seed-productivity-focus-distractions",
    title: "Focus Without Distractions",
    category: "Productivity",
    duration: 7,
    stakeAmount: "50000000000000000", // 0.05 MON
    displayFeeMon: "0.05 MON",
    description:
      "Complete a focused work session without unnecessary distractions. Execute a 90-minute deep work block with all social notifications blocked.",
    status: "open",
    daysStartedAgo: -1, // starts tomorrow
    daysUntilEnd: 7,
    participantCount: 7,
    maximumParticipants: 16,
    dailyDeadline: "08:00 PM",
    specificRules:
      "Complete at least 90 minutes of Pomodoro/deep focus. Submit screenshot of focus session timer or task checklist.",
    submissionSchedule: "Daily Window: 08:00 AM – 08:00 PM UTC",
  },
];

/**
 * Idempotently seeds the 8 PACTUM demo challenges into MongoDB.
 * Safe to run against production database: uses findOneAndUpdate with seedKey,
 * never drops collections, never touches user-created challenges.
 */
export async function seedChallenges(): Promise<{
  insertedCount: number;
  updatedCount: number;
  totalSeeded: number;
}> {
  console.log(`[Seed] Connecting to MongoDB: ${sanitizeMongoUri(env.MONGODB_URI)}`);
  await connectDatabase(env.MONGODB_URI);

  // 1. Upsert curator user for seed challenges
  const curator = await UserModel.findOneAndUpdate(
    { privyUserId: "seed_curator_pactum" },
    {
      $set: {
        privyUserId: "seed_curator_pactum",
        displayName: "PACTUM Curator",
        walletAddress: "0x0000000000000000000000000000000000000000",
        avatarUrl: null,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  console.log(`[Seed] Curator user ready: ID=${curator._id}`);

  let insertedCount = 0;
  let updatedCount = 0;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const def of SEED_CHALLENGES) {
    const existing = await ChallengeModel.findOne({ seedKey: def.seedKey });
    const isNew = !existing;

    const startAt = new Date(now - def.daysStartedAgo * ONE_DAY_MS);
    const endAt = new Date(startAt.getTime() + def.duration * ONE_DAY_MS);

    await ChallengeModel.findOneAndUpdate(
      { seedKey: def.seedKey },
      {
        $set: {
          creatorId: curator._id,
          title: def.title,
          category: def.category,
          duration: def.duration,
          stakeAmount: def.stakeAmount,
          description: def.description,
          status: def.status,
          startAt,
          endAt,
          participantCount: def.participantCount,
          maximumParticipants: def.maximumParticipants,
          minimumParticipants: 1,
          tokenSymbol: "MON",
          dailyDeadline: def.dailyDeadline,
          specificRules: def.specificRules,
          submissionSchedule: def.submissionSchedule,
          submissionRules: "Submit daily photo or log evidence within the scheduled window. Peer consensus requires 2 approvals.",
          verificationMethod: "peer_voting",
          chainId: 10143,
          contractAddress: null, // explicit off-chain demo status
          imageUrl: null,
          seedKey: def.seedKey,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (isNew) {
      insertedCount++;
      console.log(`  + Inserted: [${def.status.toUpperCase()}] "${def.title}" (${def.category}, ${def.displayFeeMon})`);
    } else {
      updatedCount++;
      console.log(`  ~ Updated: [${def.status.toUpperCase()}] "${def.title}" (${def.category}, ${def.displayFeeMon})`);
    }
  }

  const totalSeeded = insertedCount + updatedCount;
  console.log(
    `[Seed] Finished successfully: ${insertedCount} newly inserted, ${updatedCount} updated, total ${totalSeeded} seed challenges active.`
  );

  return { insertedCount, updatedCount, totalSeeded };
}

// Allow direct CLI invocation
const isDirectRun =
  Boolean(process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("seedChallenges"));

if (isDirectRun) {
  seedChallenges()
    .then(async (res) => {
      console.log("[Seed] Completed:", res);
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[Seed] Execution error:", err);
      await disconnectDatabase();
      process.exit(1);
    });
}
