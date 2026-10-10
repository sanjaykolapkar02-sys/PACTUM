import mongoose from "mongoose";
import VoteModel, { VoteDocument } from "./vote.model";
import SubmissionModel from "../submissions/submission.model";
import ChallengeModel from "../challenges/challenge.model";
import ParticipantModel from "../participants/participant.model";
import { upsertUserFromPrivy } from "../users/user.service";
import { ApiError } from "../../utils/ApiError";

export interface CastVoteInput {
  vote: "approve" | "reject";
  comment?: string | null;
}

/**
 * Records a peer verification vote on a challenge submission.
 * Enforces one vote per voter and prevents self-voting.
 */
export async function castVote(
  submissionId: string,
  voterPrivyUserId: string,
  input: CastVoteInput
): Promise<VoteDocument> {
  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw ApiError.badRequest("Invalid submission ID format");
  }

  const submission = await SubmissionModel.findById(submissionId);
  if (!submission) {
    throw ApiError.notFound("Submission not found");
  }

  const challenge = await ChallengeModel.findById(submission.challengeId);
  if (!challenge) {
    throw ApiError.notFound("Challenge not found");
  }

  if (challenge.status === "completed" || challenge.status === "cancelled") {
    throw ApiError.badRequest(`Cannot vote on a challenge with status '${challenge.status}'`);
  }

  const voter = await upsertUserFromPrivy(voterPrivyUserId);

  // Retrieve participant to prevent self-voting
  const participant = await ParticipantModel.findById(submission.participantId);
  if (!participant) {
    throw ApiError.notFound("Submission participant record not found");
  }

  if (participant.userId.toString() === voter._id.toString()) {
    throw ApiError.badRequest("Participants cannot vote on their own submission");
  }

  // Prevent duplicate votes by the same voter on the same submission
  const existingVote = await VoteModel.findOne({
    submissionId: submission._id,
    voterId: voter._id,
  });

  if (existingVote) {
    throw ApiError.conflict("You have already voted on this submission");
  }

  try {
    const vote = await VoteModel.create({
      challengeId: submission.challengeId,
      submissionId: submission._id,
      voterId: voter._id,
      vote: input.vote,
      comment: input.comment || null,
    });

    return vote;
  } catch (err: any) {
    if (err.code === 11000) {
      throw ApiError.conflict("You have already voted on this submission");
    }
    throw err;
  }
}

/**
 * Lists votes for a specific submission.
 */
export async function getSubmissionVotes(submissionId: string): Promise<VoteDocument[]> {
  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw ApiError.badRequest("Invalid submission ID format");
  }

  return VoteModel.find({ submissionId })
    .populate("voterId", "displayName walletAddress avatarUrl")
    .sort({ createdAt: 1 });
}
