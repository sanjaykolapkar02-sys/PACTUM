import mongoose from "mongoose";
import SubmissionModel, { SubmissionDocument } from "./submission.model";
import ParticipantModel from "../participants/participant.model";
import ChallengeModel from "../challenges/challenge.model";
import { upsertUserFromPrivy } from "../users/user.service";
import { ApiError } from "../../utils/ApiError";

export interface CreateSubmissionInput {
  evidenceUrl: string;
  note?: string | null;
}

/**
 * Creates an evidence submission for an active challenge participant.
 */
export async function createSubmission(
  challengeId: string,
  submitterPrivyUserId: string,
  input: CreateSubmissionInput
): Promise<SubmissionDocument> {
  if (!mongoose.Types.ObjectId.isValid(challengeId)) {
    throw ApiError.badRequest("Invalid challenge ID format");
  }

  const challenge = await ChallengeModel.findById(challengeId);
  if (!challenge) {
    throw ApiError.notFound("Challenge not found");
  }

  const user = await upsertUserFromPrivy(submitterPrivyUserId);

  // Validate that user is a participant
  const participant = await ParticipantModel.findOne({
    challengeId: challenge._id,
    userId: user._id,
  });

  if (!participant) {
    throw ApiError.forbidden("You must be an enrolled participant to submit evidence");
  }

  if (participant.status !== "joined" && participant.status !== "active") {
    throw ApiError.forbidden(`Participant status '${participant.status}' is not eligible to submit`);
  }

  // Validate challenge is active or within submission window
  const now = new Date();
  if (now < challenge.startAt) {
    throw ApiError.badRequest("Challenge has not started yet");
  }
  if (now > challenge.endAt) {
    throw ApiError.badRequest("Challenge submission deadline has passed");
  }

  const submission = await SubmissionModel.create({
    challengeId: challenge._id,
    participantId: participant._id,
    evidenceUrl: input.evidenceUrl,
    note: input.note || null,
    status: "submitted",
    submittedAt: now,
  });

  return submission;
}

/**
 * Lists all submissions for a challenge.
 */
export async function getChallengeSubmissions(
  challengeId: string
): Promise<SubmissionDocument[]> {
  if (!mongoose.Types.ObjectId.isValid(challengeId)) {
    throw ApiError.badRequest("Invalid challenge ID format");
  }

  return SubmissionModel.find({ challengeId })
    .populate({
      path: "participantId",
      populate: {
        path: "userId",
        select: "displayName walletAddress avatarUrl",
      },
    })
    .sort({ submittedAt: -1 });
}
