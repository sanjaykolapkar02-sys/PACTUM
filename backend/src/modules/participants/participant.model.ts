import { Schema, model, Document, InferSchemaType } from "mongoose";

export const PARTICIPANT_STATUSES = [
  "joined",
  "active",
  "completed",
  "failed",
  "refunded",
] as const;

export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

const participantSchema = new Schema(
  {
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    walletAddress: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: PARTICIPANT_STATUSES,
      default: "joined",
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

// Unique compound index preventing duplicate challenge membership for the same user
participantSchema.index({ challengeId: 1, userId: 1 }, { unique: true });

export type Participant = InferSchemaType<typeof participantSchema>;
export type ParticipantDocument = Document & Participant;

export const ParticipantModel = model<ParticipantDocument>("Participant", participantSchema);
export default ParticipantModel;
