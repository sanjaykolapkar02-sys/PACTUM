import { Router } from "express";
import { requireAuth } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as controller from "./challenge.controller";
import {
  createChallengeSchema,
  updateChallengeSchema,
  challengeQuerySchema,
  challengeIdParamSchema,
} from "./challenge.validation";

const router = Router();

// GET /api/challenges - list challenges
router.get(
  "/",
  validateRequest({ query: challengeQuerySchema }),
  asyncHandler(controller.handleListChallenges)
);

// POST /api/challenges/seed - seed demo challenges (controlled/idempotent)
router.post("/seed", asyncHandler(controller.handleSeedChallenges));

// GET /api/challenges/:id - get single challenge
router.get(
  "/:id",
  validateRequest({ params: challengeIdParamSchema }),
  asyncHandler(controller.handleGetChallenge)
);

// POST /api/challenges - create challenge (auth required)
router.post(
  "/",
  requireAuth,
  validateRequest({ body: createChallengeSchema }),
  asyncHandler(controller.handleCreateChallenge)
);

// PATCH /api/challenges/:id - update challenge (auth required, creator only)
router.patch(
  "/:id",
  requireAuth,
  validateRequest({
    params: challengeIdParamSchema,
    body: updateChallengeSchema,
  }),
  asyncHandler(controller.handleUpdateChallenge)
);

// POST /api/challenges/:id/join - join challenge (auth required)
router.post(
  "/:id/join",
  requireAuth,
  validateRequest({ params: challengeIdParamSchema }),
  asyncHandler(controller.handleJoinChallenge)
);

// GET /api/challenges/:id/participants - list participants
router.get(
  "/:id/participants",
  validateRequest({ params: challengeIdParamSchema }),
  asyncHandler(controller.handleGetParticipants)
);

export default router;
