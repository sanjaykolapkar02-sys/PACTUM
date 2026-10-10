import mongoose from "mongoose";
import ChallengeModel, { ChallengeDocument, ChallengeStatus } from "./challenge.model";
import ParticipantModel, { ParticipantDocument } from "../participants/participant.model";
import { upsertUserFromPrivy } from "../users/user.service";
import { ApiError } from "../../utils/ApiError";

export interface CreateChallengeInput {
  title: string;
  description: string;
  category: string;
  duration: number;
  startAt: string;
  endAt: string;
  stakeAmount: string;
  maximumParticipants?: number;
  imageUrl?: string | null;
  dailyDeadline?: string;
  specificRules?: string;
  submissionRules?: string;
  submissionSchedule?: string;
}

export interface UpdateChallengeInput {
  title?: string;
  description?: string;
  category?: string;
  imageUrl?: string | null;
  status?: ChallengeStatus;
  dailyDeadline?: string;
  specificRules?: string;
  submissionRules?: string;
  submissionSchedule?: string;
}

export interface ChallengeQueryFilters {
  status?: string;
  category?: string;
  search?: string;
  page: number;
  limit: number;
}

/**
 * Creates a new habit challenge linked to the verified creator.
 */
export async function createChallenge(
  creatorPrivyUserId: string,
  input: CreateChallengeInput
): Promise<ChallengeDocument> {
  const creator = await upsertUserFromPrivy(creatorPrivyUserId);

  const challenge = await ChallengeModel.create({
    creatorId: creator._id,
    title: input.title,
    description: input.description,
    category: input.category,
    duration: input.duration,
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    stakeAmount: input.stakeAmount,
    maximumParticipants: input.maximumParticipants || null,
    imageUrl: input.imageUrl || null,
    dailyDeadline: input.dailyDeadline || "10:00 PM",
    specificRules: input.specificRules || null,
    submissionRules: input.submissionRules || null,
    submissionSchedule: input.submissionSchedule || null,
    status: "open",
    participantCount: 0,
    chainId: 10143,
  });

  return challenge;
}

/**
 * Lists challenges with pagination and filtering.
 */
export async function listChallenges(filters: ChallengeQueryFilters) {
  const query: Record<string, unknown> = {};

  if (filters.status) {
    if (filters.status === "active") {
      query.status = { $in: ["active", "open"] };
    } else if (filters.status === "upcoming") {
      query.$or = [{ status: "open" }, { startAt: { $gt: new Date() } }];
    } else if (filters.status.includes(",")) {
      const parts = filters.status.split(",").map((s) => s.trim()).filter(Boolean);
      query.status = { $in: parts };
    } else {
      query.status = filters.status;
    }
  }
  if (filters.category) {
    query.category = new RegExp(filters.category, "i");
  }
  if (filters.search) {
    const rx = new RegExp(filters.search, "i");
    query.$or = [{ title: rx }, { category: rx }, { description: rx }];
  }

  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await Promise.all([
    ChallengeModel.find(query)
      .populate("creatorId", "displayName walletAddress avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(filters.limit),
    ChallengeModel.countDocuments(query),
  ]);

  return {
    items,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / filters.limit) || 1,
  };
}

/**
 * Retrieves a single challenge by ID.
 */
export async function getChallengeById(id: string): Promise<ChallengeDocument> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid challenge identifier format");
  }

  const challenge = await ChallengeModel.findById(id).populate(
    "creatorId",
    "displayName walletAddress avatarUrl"
  );

  if (!challenge) {
    throw ApiError.notFound("Challenge not found");
  }

  return challenge;
}

/**
 * Updates a challenge. Only the verified creator may edit their challenge.
 */
export async function updateChallenge(
  id: string,
  editorPrivyUserId: string,
  input: UpdateChallengeInput
): Promise<ChallengeDocument> {
  const challenge = await getChallengeById(id);
  const editor = await upsertUserFromPrivy(editorPrivyUserId);

  const creatorObjectId =
    (challenge.creatorId as any)._id || challenge.creatorId;

  if (creatorObjectId.toString() !== editor._id.toString()) {
    throw ApiError.forbidden("Only the creator may modify this challenge");
  }

  if (input.title !== undefined) challenge.title = input.title;
  if (input.description !== undefined) challenge.description = input.description;
  if (input.category !== undefined) challenge.category = input.category;
  if (input.imageUrl !== undefined) challenge.imageUrl = input.imageUrl;
  if (input.status !== undefined) challenge.status = input.status;

  await challenge.save();
  return challenge;
}

/**
 * Enrolls an authenticated user as a challenge participant.
 * Prevents joining closed challenges and duplicate participation.
 */
export async function joinChallenge(
  challengeId: string,
  joinerPrivyUserId: string,
  walletAddress?: string | null
): Promise<ParticipantDocument> {
  const challenge = await getChallengeById(challengeId);
  const user = await upsertUserFromPrivy(joinerPrivyUserId);

  // If user already has a verified wallet address, client cannot spoof another address
  if (
    walletAddress &&
    user.walletAddress &&
    walletAddress.toLowerCase() !== user.walletAddress.toLowerCase()
  ) {
    throw ApiError.badRequest("Provided wallet address does not match your authenticated wallet");
  }

  const canonicalWallet = user.walletAddress || (walletAddress ? walletAddress.toLowerCase() : null);

  // Verify challenge is open for registration
  if (challenge.status !== "open" && challenge.status !== "draft") {
    throw ApiError.badRequest(`Cannot join challenge with status '${challenge.status}'`);
  }

  // Check if start time has already passed
  if (new Date() >= challenge.startAt) {
    throw ApiError.badRequest("Registration window has closed for this challenge");
  }

  // Check participant capacity limit
  if (
    challenge.maximumParticipants &&
    challenge.participantCount >= challenge.maximumParticipants
  ) {
    throw ApiError.badRequest("Challenge has reached maximum participant capacity");
  }

  // Check if already a participant
  const existing = await ParticipantModel.findOne({
    challengeId: challenge._id,
    userId: user._id,
  });

  if (existing) {
    throw ApiError.conflict("User has already joined this challenge");
  }

  try {
    // Create participant entry
    const participant = await ParticipantModel.create({
      challengeId: challenge._id,
      userId: user._id,
      walletAddress: canonicalWallet,
      status: "joined",
    });

    // Atomically increment participantCount
    await ChallengeModel.findByIdAndUpdate(challenge._id, {
      $inc: { participantCount: 1 },
    });

    return participant;
  } catch (err: any) {
    if (err.code === 11000) {
      throw ApiError.conflict("User has already joined this challenge");
    }
    throw err;
  }
}

/**
 * Retrieves all participants for a specific challenge.
 */
export async function getChallengeParticipants(
  challengeId: string
): Promise<ParticipantDocument[]> {
  await getChallengeById(challengeId); // Ensure challenge exists

  return ParticipantModel.find({ challengeId })
    .populate("userId", "displayName walletAddress avatarUrl")
    .sort({ joinedAt: 1 });
}
