import { Schema, model, Document, InferSchemaType } from "mongoose";

export const SUBMISSION_STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

const submissionSchema = new Schema(
  {
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
      index: true,
    },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },
    evidenceUrl: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: SUBMISSION_STATUSES,
      default: "submitted",
      index: true,
    },
    transactionHash: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

submissionSchema.index({ challengeId: 1, submittedAt: -1 });

export type Submission = InferSchemaType<typeof submissionSchema>;
export type SubmissionDocument = Document & Submission;

export const SubmissionModel = model<SubmissionDocument>("Submission", submissionSchema);
export default SubmissionModel;
