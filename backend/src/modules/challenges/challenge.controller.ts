import { Request, Response } from "express";
import * as challengeService from "./challenge.service";

export async function handleCreateChallenge(req: Request, res: Response): Promise<void> {
  const creatorPrivyUserId = req.user!.userId;
  const challenge = await challengeService.createChallenge(creatorPrivyUserId, req.body);

  res.status(201).json({
    success: true,
    data: challenge,
  });
}

export async function handleListChallenges(req: Request, res: Response): Promise<void> {
  const query = req.query as any;
  const result = await challengeService.listChallenges({
    status: query.status,
    category: query.category,
    page: query.page || 1,
    limit: query.limit || 20,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
}

export async function handleGetChallenge(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const challenge = await challengeService.getChallengeById(id);

  res.status(200).json({
    success: true,
    data: challenge,
  });
}

export async function handleUpdateChallenge(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const editorPrivyUserId = req.user!.userId;
  const updated = await challengeService.updateChallenge(id, editorPrivyUserId, req.body);

  res.status(200).json({
    success: true,
    data: updated,
  });
}

export async function handleJoinChallenge(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const joinerPrivyUserId = req.user!.userId;
  const { walletAddress } = req.body || {};

  const participant = await challengeService.joinChallenge(
    id,
    joinerPrivyUserId,
    walletAddress
  );

  res.status(201).json({
    success: true,
    message: "Successfully joined challenge",
    data: participant,
  });
}

export async function handleGetParticipants(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const participants = await challengeService.getChallengeParticipants(id);

  res.status(200).json({
    success: true,
    data: participants,
  });
}
