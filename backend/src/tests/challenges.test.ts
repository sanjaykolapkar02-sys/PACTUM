import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import { authService } from "../middleware/authenticate";
import ChallengeModel from "../modules/challenges/challenge.model";
import UserModel from "../modules/users/user.model";
import ParticipantModel from "../modules/participants/participant.model";

describe("Challenge Module APIs & Authorization", () => {
  const creatorPrivyId = "did:privy:creator123";
  const otherPrivyId = "did:privy:other456";

  const creatorUserId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  const testChallengeId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockAuthAs(userId: string) {
    vi.spyOn(authService, "verifyToken").mockResolvedValue({
      user_id: userId,
      app_id: "test-app-id",
    });
  }

  describe("GET /api/challenges", () => {
    it("returns paginated challenge list", async () => {
      const mockChallenges = [
        {
          _id: testChallengeId,
          title: "30-Day Coding Streak",
          category: "coding",
          duration: 30,
          stakeAmount: "5000000000000000000",
          status: "open",
          participantCount: 3,
        },
      ];

      vi.spyOn(ChallengeModel, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            skip: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockChallenges),
            }),
          }),
        }),
      } as any);

      vi.spyOn(ChallengeModel, "countDocuments").mockResolvedValue(1);

      const res = await request(app).get("/api/challenges?page=1&limit=10");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
    });
  });

  describe("GET /api/challenges/:id", () => {
    it("returns 400 for invalid ObjectId format", async () => {
      const res = await request(app).get("/api/challenges/not-a-valid-object-id");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 404 if challenge does not exist", async () => {
      vi.spyOn(ChallengeModel, "findById").mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      } as any);

      const res = await request(app).get(`/api/challenges/${testChallengeId.toString()}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("api_error");
      expect(res.body.message).toContain("Challenge not found");
    });
  });

  describe("POST /api/challenges", () => {
    it("rejects unauthenticated challenge creation with 401", async () => {
      const res = await request(app).post("/api/challenges").send({
        title: "Daily Workout",
      });
      expect(res.status).toBe(401);
    });

    it("validates request body and rejects floating-point stake amount", async () => {
      mockAuthAs(creatorPrivyId);

      const res = await request(app)
        .post("/api/challenges")
        .set("Authorization", "Bearer valid.token")
        .send({
          title: "Daily Workout",
          description: "Work out 30 minutes every morning",
          category: "fitness",
          duration: 30,
          startAt: new Date(Date.now() + 86400000).toISOString(),
          endAt: new Date(Date.now() + 86400000 * 31).toISOString(),
          stakeAmount: "2.5", // invalid! Must be integer base units
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
      expect(JSON.stringify(res.body.details)).toContain("stakeAmount");
    });

    it("creates challenge with valid integer base-unit stakeAmount", async () => {
      mockAuthAs(creatorPrivyId);

      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: creatorUserId,
        privyUserId: creatorPrivyId,
      } as any);

      const createdDoc = {
        _id: testChallengeId,
        creatorId: creatorUserId,
        title: "Daily Workout",
        description: "Work out 30 minutes every morning",
        category: "fitness",
        duration: 30,
        startAt: new Date(Date.now() + 86400000),
        endAt: new Date(Date.now() + 86400000 * 31),
        stakeAmount: "2500000000000000000",
        status: "open",
        participantCount: 0,
        chainId: 10143,
      };

      vi.spyOn(ChallengeModel, "create").mockResolvedValue(createdDoc as any);

      const res = await request(app)
        .post("/api/challenges")
        .set("Authorization", "Bearer valid.token")
        .send({
          title: "Daily Workout",
          description: "Work out 30 minutes every morning",
          category: "fitness",
          duration: 30,
          startAt: new Date(Date.now() + 86400000).toISOString(),
          endAt: new Date(Date.now() + 86400000 * 31).toISOString(),
          stakeAmount: "2500000000000000000",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stakeAmount).toBe("2500000000000000000");
    });
  });

  describe("PATCH /api/challenges/:id (Ownership Verification)", () => {
    it("prevents non-creator from editing challenge with 403 Forbidden", async () => {
      mockAuthAs(otherPrivyId);

      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: otherUserId,
        privyUserId: otherPrivyId,
      } as any);

      const existingChallenge = {
        _id: testChallengeId,
        creatorId: creatorUserId, // Belongs to creatorUserId, NOT otherUserId
        title: "Original Title",
        save: vi.fn(),
      };

      vi.spyOn(ChallengeModel, "findById").mockReturnValue({
        populate: vi.fn().mockResolvedValue(existingChallenge),
      } as any);

      const res = await request(app)
        .patch(`/api/challenges/${testChallengeId.toString()}`)
        .set("Authorization", "Bearer valid.token")
        .send({
          title: "Hacked Title",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Only the creator may modify this challenge");
    });
  });

  describe("POST /api/challenges/:id/join (Duplicate Participation Guard)", () => {
    it("prevents duplicate enrollment for the same user with 409 Conflict", async () => {
      mockAuthAs(creatorPrivyId);

      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: creatorUserId,
        privyUserId: creatorPrivyId,
      } as any);

      const openChallenge = {
        _id: testChallengeId,
        status: "open",
        startAt: new Date(Date.now() + 86400000), // starts tomorrow
        endAt: new Date(Date.now() + 86400000 * 7),
        participantCount: 1,
      };

      vi.spyOn(ChallengeModel, "findById").mockReturnValue({
        populate: vi.fn().mockResolvedValue(openChallenge),
      } as any);

      // User is already a participant
      vi.spyOn(ParticipantModel, "findOne").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        challengeId: testChallengeId,
        userId: creatorUserId,
      } as any);

      const res = await request(app)
        .post(`/api/challenges/${testChallengeId.toString()}/join`)
        .set("Authorization", "Bearer valid.token");

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("User has already joined this challenge");
    });

    it("prevents joining when challenge start time has already passed", async () => {
      mockAuthAs(creatorPrivyId);

      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: creatorUserId,
        privyUserId: creatorPrivyId,
      } as any);

      const expiredChallenge = {
        _id: testChallengeId,
        status: "open",
        startAt: new Date(Date.now() - 10000), // started in the past
        participantCount: 1,
      };

      vi.spyOn(ChallengeModel, "findById").mockReturnValue({
        populate: vi.fn().mockResolvedValue(expiredChallenge),
      } as any);

      const res = await request(app)
        .post(`/api/challenges/${testChallengeId.toString()}/join`)
        .set("Authorization", "Bearer valid.token");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Registration window has closed");
    });

    it("prevents joining with a wallet address that does not match authenticated user wallet", async () => {
      mockAuthAs(creatorPrivyId);

      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: creatorUserId,
        privyUserId: creatorPrivyId,
        walletAddress: "0x71f00000000000000000000000000000000092a4",
      } as any);

      const openChallenge = {
        _id: testChallengeId,
        status: "open",
        startAt: new Date(Date.now() + 86400000),
        participantCount: 0,
      };

      vi.spyOn(ChallengeModel, "findById").mockReturnValue({
        populate: vi.fn().mockResolvedValue(openChallenge),
      } as any);

      const res = await request(app)
        .post(`/api/challenges/${testChallengeId.toString()}/join`)
        .set("Authorization", "Bearer valid.token")
        .send({
          walletAddress: "0x0000000000000000000000000000000000000001", // spoofed address!
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Provided wallet address does not match your authenticated wallet");
    });

    it("handles concurrent duplicate key error (code 11000) safely with 409 Conflict", async () => {
      mockAuthAs(creatorPrivyId);

      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: creatorUserId,
        privyUserId: creatorPrivyId,
      } as any);

      const openChallenge = {
        _id: testChallengeId,
        status: "open",
        startAt: new Date(Date.now() + 86400000),
        participantCount: 0,
      };

      vi.spyOn(ChallengeModel, "findById").mockReturnValue({
        populate: vi.fn().mockResolvedValue(openChallenge),
      } as any);

      vi.spyOn(ParticipantModel, "findOne").mockResolvedValue(null);
      // Simulate concurrent insert race resulting in duplicate key error 11000
      const mongoDupError: any = new Error("E11000 duplicate key error");
      mongoDupError.code = 11000;
      vi.spyOn(ParticipantModel, "create").mockRejectedValue(mongoDupError);

      const res = await request(app)
        .post(`/api/challenges/${testChallengeId.toString()}/join`)
        .set("Authorization", "Bearer valid.token");

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("User has already joined this challenge");
    });
  });
});
