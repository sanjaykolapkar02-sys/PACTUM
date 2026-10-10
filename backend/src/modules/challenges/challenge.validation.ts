import { z } from "zod";
import { CHALLENGE_STATUSES } from "./challenge.model";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId format");

export const challengeIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createChallengeSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
    description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
    category: z.string().trim().min(2, "Category is required").max(80),
    duration: z.number().int().min(1, "Duration must be at least 1 day"),
    startAt: z.string().datetime({ message: "startAt must be a valid ISO date string" }),
    endAt: z.string().datetime({ message: "endAt must be a valid ISO date string" }),
    stakeAmount: z
      .string()
      .regex(/^\d+$/, "stakeAmount must be an integer base-unit string (wei)")
      .refine(
        (val) => {
          try {
            return /^\d+$/.test(val) && BigInt(val) > 0n;
          } catch {
            return false;
          }
        },
        { message: "stakeAmount must be greater than zero" }
      ),
    maximumParticipants: z.number().int().min(1).optional(),
    imageUrl: z.string().url("imageUrl must be a valid URL").optional().nullable(),
    dailyDeadline: z.string().trim().max(50).optional(),
    specificRules: z.string().trim().max(2000).optional(),
    submissionRules: z.string().trim().max(2000).optional(),
    submissionSchedule: z.string().trim().max(500).optional(),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "endAt must be later than startAt",
    path: ["endAt"],
  });

export const updateChallengeSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    imageUrl: z.string().url().optional().nullable(),
    status: z.enum(CHALLENGE_STATUSES).optional(),
    dailyDeadline: z.string().trim().max(50).optional(),
    specificRules: z.string().trim().max(2000).optional(),
    submissionRules: z.string().trim().max(2000).optional(),
    submissionSchedule: z.string().trim().max(500).optional(),
  })
  .strict();

export const challengeQuerySchema = z.object({
  status: z.string().trim().optional(),
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
});
