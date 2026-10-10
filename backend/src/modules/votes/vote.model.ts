import { Schema, model, Document, InferSchemaType } from "mongoose";

const voteSchema = new Schema(
  {
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
      index: true,
    },
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
      index: true,
    },
    voterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    vote: {
      type: String,
      enum: ["approve", "reject"],
      required: true,
    },
    comment: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Prevent duplicate votes by the same voter on the same submission
voteSchema.index({ submissionId: 1, voterId: 1 }, { unique: true });

export type Vote = InferSchemaType<typeof voteSchema>;
export type VoteDocument = Document & Vote;

export const VoteModel = model<VoteDocument>("Vote", voteSchema);
export default VoteModel;
