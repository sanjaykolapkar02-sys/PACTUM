import { Schema, model, Document, InferSchemaType } from "mongoose";

export const CHALLENGE_STATUSES = [
  "draft",
  "open",
  "active",
  "completed",
  "cancelled",
] as const;

export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

const challengeSchema = new Schema(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // duration in days
      required: true,
      min: 1,
    },
    stakeAmount: {
      type: String, // integer base-units string (wei / base tokens) to avoid floating-point loss
      required: true,
      validate: {
        validator: (value: string) => /^\d+$/.test(value) && BigInt(value) > 0n,
        message: "stakeAmount must be a positive integer base-unit string",
      },
    },
    participantLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    minimumParticipants: {
      type: Number,
      default: 1,
      min: 1,
    },
    maximumParticipants: {
      type: Number,
      default: null,
      min: 1,
    },
    participantCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: CHALLENGE_STATUSES,
      default: "draft",
      index: true,
    },
    verificationMethod: {
      type: String,
      enum: ["peer_voting", "admin", "ai_automated"],
      default: "peer_voting",
    },
    chainId: {
      type: Number,
      default: 10143,
      immutable: true,
    },
    contractAddress: {
      type: String,
      default: null,
      trim: true,
    },
    tokenSymbol: {
      type: String,
      default: "MON",
      trim: true,
    },
    dailyDeadline: {
      type: String,
      default: "10:00 PM",
      trim: true,
    },
    specificRules: {
      type: String,
      default: null,
      trim: true,
    },
    submissionRules: {
      type: String,
      default: null,
      trim: true,
    },
    submissionSchedule: {
      type: String,
      default: null,
      trim: true,
    },
    seedKey: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for listing and filtering
challengeSchema.index({ status: 1, startAt: 1 });
challengeSchema.index({ creatorId: 1, status: 1 });

export type Challenge = InferSchemaType<typeof challengeSchema>;
export type ChallengeDocument = Document & Challenge;

export const ChallengeModel = model<ChallengeDocument>("Challenge", challengeSchema);
export default ChallengeModel;
