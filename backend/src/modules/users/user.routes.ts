import { Router } from "express";
import { requireAuth } from "../../middleware/authenticate";
import { getAuthenticatedUser } from "./user.controller";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Supports both /api/auth/me and /api/me
router.get(["/me", "/"], requireAuth, asyncHandler(getAuthenticatedUser));

export default router;
