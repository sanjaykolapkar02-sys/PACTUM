import { Router } from "express";
import { requireAuth } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as controller from "./submission.controller";
import { challengeIdParamSchema } from "../challenges/challenge.validation";
import {
  submissionIdParamSchema,
  createSubmissionSchema,
  castVoteSchema,
} from "./submission.validation";

// Router for /api/challenges/:id/submissions
export const challengeSubmissionsRouter = Router({ mergeParams: true });

challengeSubmissionsRouter.post(
  "/",
  requireAuth,
  validateRequest({
    params: challengeIdParamSchema,
    body: createSubmissionSchema,
  }),
  asyncHandler(controller.handleCreateSubmission)
);

challengeSubmissionsRouter.get(
  "/",
  validateRequest({ params: challengeIdParamSchema }),
  asyncHandler(controller.handleGetChallengeSubmissions)
);

// Router for /api/submissions/:id/votes
export const submissionVotesRouter = Router();

submissionVotesRouter.post(
  "/:id/votes",
  requireAuth,
  validateRequest({
    params: submissionIdParamSchema,
    body: castVoteSchema,
  }),
  asyncHandler(controller.handleCastVote)
);

submissionVotesRouter.get(
  "/:id/votes",
  validateRequest({ params: submissionIdParamSchema }),
  asyncHandler(controller.handleGetSubmissionVotes)
);
