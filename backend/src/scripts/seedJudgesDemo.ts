import { connectDatabase, disconnectDatabase, sanitizeMongoUri } from "../config/database";
import { env } from "../config/env";
import UserModel from "../modules/users/user.model";
import ChallengeModel from "../modules/challenges/challenge.model";
import ParticipantModel from "../modules/participants/participant.model";
import SubmissionModel from "../modules/submissions/submission.model";

/**
 * Seeds the ONE complete, polished demo challenge for the Judges' presentation:
 * "7-Day Coding Consistency Challenge"
 *
 * 100% idempotent: running multiple times updates in-place without duplicates.
 * Safe: Never touches existing user challenges or data.
 */
export async function seedJudgesDemoChallenge(): Promise<{
  challengeId: string;
  title: string;
  status: string;
  duration: number;
}> {
  console.log(`[Judges Demo Seed] Connecting to MongoDB: ${sanitizeMongoUri(env.MONGODB_URI)}`);
  await connectDatabase(env.MONGODB_URI);

  // 1. Upsert Curator User
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

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  // Day 4 of 7: Started 3 days ago, ends in 4 days
  const startAt = new Date(now - 3 * ONE_DAY_MS);
  const endAt = new Date(startAt.getTime() + 7 * ONE_DAY_MS);

  // 2. Upsert the ONE Demo Challenge
  const challenge = await ChallengeModel.findOneAndUpdate(
    { seedKey: "demo-judges-coding-consistency" },
    {
      $set: {
        creatorId: curator._id,
        title: "7-Day Coding Consistency Challenge",
        category: "Learning & Productivity",
        duration: 7,
        stakeAmount: "100000000000000000", // 0.10 MON (wei)
        description:
          "Build a consistent coding habit by completing a focused coding session every day for seven consecutive days.",
        status: "active",
        startAt,
        endAt,
        participantCount: 6,
        maximumParticipants: 15,
        minimumParticipants: 1,
        tokenSymbol: "MON",
        dailyDeadline: "10:00 PM",
        specificRules:
          "1. Participants must complete the daily coding session (minimum 30 minutes).\n" +
          "2. Participants submit proof for each challenge day (screenshot or commit/PR link).\n" +
          "3. Submissions are recorded with ISO timestamps.\n" +
          "4. Submissions can be reviewed according to the application's existing verification workflow.\n" +
          "5. Challenge completion depends on the actual configured rules and submission records.",
        submissionRules:
          "Proof Requirements: Screenshot of coding progress in IDE/terminal, or a short text explanation with a link to the work completed.",
        submissionSchedule: "Daily Window: 08:00 AM – 10:00 PM UTC",
        verificationMethod: "peer_voting",
        chainId: 10143,
        contractAddress: null, // explicit off-chain demo status
        imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
        seedKey: "demo-judges-coding-consistency",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  console.log(`[Judges Demo Seed] Challenge ready: ID=${challenge._id} ("${challenge.title}")`);

  // 3. Upsert Demo Peer Participants
  const peer1 = await UserModel.findOneAndUpdate(
    { privyUserId: "demo_peer_alex_chen" },
    {
      $set: {
        privyUserId: "demo_peer_alex_chen",
        displayName: "Alex Chen",
        walletAddress: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  const peer2 = await UserModel.findOneAndUpdate(
    { privyUserId: "demo_peer_priya_sharma" },
    {
      $set: {
        privyUserId: "demo_peer_priya_sharma",
        displayName: "Priya Sharma",
        walletAddress: "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  const part1 = await ParticipantModel.findOneAndUpdate(
    { challengeId: challenge._id, userId: peer1._id },
    {
      $set: {
        challengeId: challenge._id,
        userId: peer1._id,
        walletAddress: peer1.walletAddress,
        joinedAt: startAt,
        status: "active",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  const part2 = await ParticipantModel.findOneAndUpdate(
    { challengeId: challenge._id, userId: peer2._id },
    {
      $set: {
        challengeId: challenge._id,
        userId: peer2._id,
        walletAddress: peer2.walletAddress,
        joinedAt: startAt,
        status: "active",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  // 4. Upsert Sample Verified Submissions for History Display
  // Day 1 submission (Alex)
  await SubmissionModel.findOneAndUpdate(
    { challengeId: challenge._id, participantId: part1._id },
    {
      $set: {
        challengeId: challenge._id,
        participantId: part1._id,
        evidenceUrl:
          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&auto=format&fit=crop&q=80",
        note: "Day 1: Solved 2 LeetCode Tree traversal problems (DFS & BFS) and pushed solution commits.",
        status: "approved",
        submittedAt: new Date(startAt.getTime() + 10 * 3600 * 1000), // Day 1
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  // Day 2 submission (Priya)
  await SubmissionModel.findOneAndUpdate(
    { challengeId: challenge._id, participantId: part2._id },
    {
      $set: {
        challengeId: challenge._id,
        participantId: part2._id,
        evidenceUrl:
          "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=700&auto=format&fit=crop&q=80",
        note: "Day 2: Built React hook for optimistic transaction sync on Monad testnet. PR #18 opened.",
        status: "approved",
        submittedAt: new Date(startAt.getTime() + ONE_DAY_MS + 14 * 3600 * 1000), // Day 2
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  console.log(`[Judges Demo Seed] Complete! Challenge ID: ${challenge._id}`);
  return {
    challengeId: challenge._id.toString(),
    title: challenge.title,
    status: challenge.status,
    duration: challenge.duration,
  };
}

// Allow direct CLI invocation
const isDirectRun =
  Boolean(process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("seedJudgesDemo"));

if (isDirectRun) {
  seedJudgesDemoChallenge()
    .then(async (res) => {
      console.log("[Judges Demo Seed] Result:", res);
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[Judges Demo Seed] Error:", err);
      await disconnectDatabase();
      process.exit(1);
    });
}
