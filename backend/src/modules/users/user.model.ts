import { Schema, model, Document, InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    privyUserId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    walletAddress: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string | null) => value === null || /^0x[a-fA-F0-9]{40}$/.test(value),
        message: "Invalid EVM wallet address format",
      },
    },
    displayName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },
    avatarUrl: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = Document & User;

export const UserModel = model<UserDocument>("User", userSchema);
export default UserModel;
