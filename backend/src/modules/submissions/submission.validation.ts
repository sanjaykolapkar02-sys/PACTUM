import { z } from "zod";
import { objectIdSchema } from "../challenges/challenge.validation";

export const submissionIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createSubmissionSchema = z.object({
  evidenceUrl: z
    .string()
    .url("evidenceUrl must be a valid HTTPS or HTTP URL")
    .refine((url) => url.startsWith("https://") || url.startsWith("http://"), {
      message: "evidenceUrl must be an HTTP or HTTPS URL",
    }),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const castVoteSchema = z.object({
  vote: z.enum(["approve", "reject"], {
    message: "vote must be either 'approve' or 'reject'",
  }),
  comment: z.string().trim().max(500).optional().nullable(),
});
