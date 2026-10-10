import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import UserModel from "../modules/users/user.model";
import ChallengeModel from "../modules/challenges/challenge.model";
import ParticipantModel from "../modules/participants/participant.model";
import SubmissionModel from "../modules/submissions/submission.model";
import VoteModel from "../modules/votes/vote.model";

describe("Database Models Validation Tests", () => {
  describe("UserModel", () => {
    it("validates required privyUserId", async () => {
      const user = new UserModel({});
      await expect(user.validate()).rejects.toThrow();
    });

    it("accepts valid EVM address format", async () => {
      const user = new UserModel({
        privyUserId: "did:privy:cm1234567890",
        walletAddress: "0x71F00000000000000000000000000000000092A4",
      });
      await expect(user.validate()).resolves.toBeUndefined();
      expect(user.walletAddress).toBe("0x71f00000000000000000000000000000000092a4");
    });

    it("rejects invalid EVM address format", async () => {
      const user = new UserModel({
        privyUserId: "did:privy:cm1234567890",
        walletAddress: "not-an-evm-address",
      });
      await expect(user.validate()).rejects.toThrow(/Invalid EVM wallet address format/);
    });
  });

  describe("ChallengeModel", () => {
    it("validates required fields", async () => {
      const challenge = new ChallengeModel({});
      await expect(challenge.validate()).rejects.toThrow();
    });

    it("rejects floating-point stakeAmount strings", async () => {
      const challenge = new ChallengeModel({
        creatorId: new mongoose.Types.ObjectId(),
        title: "Daily Morning Run",
        description: "Run 5k every morning",
        category: "fitness",
        startAt: new Date(),
        endAt: new Date(Date.now() + 86400000 * 7),
        duration: 7,
        stakeAmount: "1.5", // invalid! Must be integer base units
      });
      await expect(challenge.validate()).rejects.toThrow(/positive integer base-unit string/);
    });

    it("accepts valid integer base-unit stakeAmount string", async () => {
      const challenge = new ChallengeModel({
        creatorId: new mongoose.Types.ObjectId(),
        title: "Daily Morning Run",
        description: "Run 5k every morning",
        category: "fitness",
        startAt: new Date(),
        endAt: new Date(Date.now() + 86400000 * 7),
        duration: 7,
        stakeAmount: "1000000000000000000", // 1 MON in wei
      });
      await expect(challenge.validate()).resolves.toBeUndefined();
      expect(challenge.chainId).toBe(10143);
      expect(challenge.status).toBe("draft");
    });
  });

  describe("ParticipantModel", () => {
    it("validates required fields and defaults", async () => {
      const participant = new ParticipantModel({
        challengeId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
      });
      await expect(participant.validate()).resolves.toBeUndefined();
      expect(participant.status).toBe("joined");
      expect(participant.joinedAt).toBeInstanceOf(Date);
    });
  });

  describe("SubmissionModel", () => {
    it("validates required fields", async () => {
      const submission = new SubmissionModel({});
      await expect(submission.validate()).rejects.toThrow();
    });
  });

  describe("VoteModel", () => {
    it("validates required vote choices", async () => {
      const vote = new VoteModel({
        challengeId: new mongoose.Types.ObjectId(),
        submissionId: new mongoose.Types.ObjectId(),
        voterId: new mongoose.Types.ObjectId(),
        vote: "approve",
      });
      await expect(vote.validate()).resolves.toBeUndefined();
    });

    it("rejects invalid vote value", async () => {
      const vote = new VoteModel({
        challengeId: new mongoose.Types.ObjectId(),
        submissionId: new mongoose.Types.ObjectId(),
        voterId: new mongoose.Types.ObjectId(),
        vote: "invalid_choice" as any,
      });
      await expect(vote.validate()).rejects.toThrow();
    });
  });
});
