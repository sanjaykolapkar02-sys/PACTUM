import { Request, Response } from "express";
import * as submissionService from "./submission.service";
import * as voteService from "../votes/vote.service";

export async function handleCreateSubmission(req: Request, res: Response): Promise<void> {
  const challengeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const submitterPrivyUserId = req.user!.userId;

  const submission = await submissionService.createSubmission(
    challengeId,
    submitterPrivyUserId,
    req.body
  );

  res.status(201).json({
    success: true,
    message: "Evidence submitted successfully",
    data: submission,
  });
}

export async function handleGetChallengeSubmissions(req: Request, res: Response): Promise<void> {
  const challengeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const submissions = await submissionService.getChallengeSubmissions(challengeId);

  res.status(200).json({
    success: true,
    data: submissions,
  });
}

export async function handleCastVote(req: Request, res: Response): Promise<void> {
  const submissionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const voterPrivyUserId = req.user!.userId;

  const vote = await voteService.castVote(submissionId, voterPrivyUserId, req.body);

  res.status(201).json({
    success: true,
    message: "Vote recorded successfully",
    data: vote,
  });
}

export async function handleGetSubmissionVotes(req: Request, res: Response): Promise<void> {
  const submissionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const votes = await voteService.getSubmissionVotes(submissionId);

  res.status(200).json({
    success: true,
    data: votes,
  });
}
