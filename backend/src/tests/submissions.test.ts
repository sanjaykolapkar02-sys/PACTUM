import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import { authService } from "../middleware/authenticate";
import ChallengeModel from "../modules/challenges/challenge.model";
import UserModel from "../modules/users/user.model";
import ParticipantModel from "../modules/participants/participant.model";
import SubmissionModel from "../modules/submissions/submission.model";
import VoteModel from "../modules/votes/vote.model";

describe("Submissions & Peer Voting Module", () => {
  const user1PrivyId = "did:privy:user1";
  const user2PrivyId = "did:privy:user2";

  const user1Id = new mongoose.Types.ObjectId();
  const user2Id = new mongoose.Types.ObjectId();
  const challengeId = new mongoose.Types.ObjectId();
  const participantId = new mongoose.Types.ObjectId();
  const submissionId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockAuthAs(userId: string) {
    vi.spyOn(authService, "verifyToken").mockResolvedValue({
      user_id: userId,
      app_id: "test-app-id",
    });
  }

  describe("POST /api/challenges/:id/submissions", () => {
    it("rejects submission if user is not an enrolled participant with 403", async () => {
      mockAuthAs(user1PrivyId);

      vi.spyOn(ChallengeModel, "findById").mockResolvedValue({
        _id: challengeId,
        startAt: new Date(Date.now() - 86400000), // started yesterday
        endAt: new Date(Date.now() + 86400000 * 5),
      } as any);

      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: user1Id,
        privyUserId: user1PrivyId,
      } as any);

      // Not found in participants
      vi.spyOn(ParticipantModel, "findOne").mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/challenges/${challengeId.toString()}/submissions`)
        .set("Authorization", "Bearer valid.token")
        .send({
          evidenceUrl: "https://strava.com/activities/12345",
          note: "Completed 5km morning run",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("must be an enrolled participant");
    });

    it("rejects submission if challenge deadline has passed", async () => {
      mockAuthAs(user1PrivyId);

      vi.spyOn(ChallengeModel, "findById").mockResolvedValue({
        _id: challengeId,
        startAt: new Date(Date.now() - 86400000 * 10),
        endAt: new Date(Date.now() - 10000), // ended in the past
      } as any);

      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: user1Id,
        privyUserId: user1PrivyId,
      } as any);

      vi.spyOn(ParticipantModel, "findOne").mockResolvedValue({
        _id: participantId,
        challengeId,
        userId: user1Id,
        status: "joined",
      } as any);

      const res = await request(app)
        .post(`/api/challenges/${challengeId.toString()}/submissions`)
        .set("Authorization", "Bearer valid.token")
        .send({
          evidenceUrl: "https://strava.com/activities/12345",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("submission deadline has passed");
    });
  });

  describe("POST /api/submissions/:id/votes", () => {
    it("prevents self-voting on one's own submission with 400 Bad Request", async () => {
      mockAuthAs(user1PrivyId);

      vi.spyOn(ChallengeModel, "findById").mockResolvedValue({
        _id: challengeId,
        status: "active",
      } as any);

      vi.spyOn(SubmissionModel, "findById").mockResolvedValue({
        _id: submissionId,
        challengeId,
        participantId,
      } as any);

      // Voter is user1
      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: user1Id,
        privyUserId: user1PrivyId,
      } as any);

      // Participant who made submission is also user1!
      vi.spyOn(ParticipantModel, "findById").mockResolvedValue({
        _id: participantId,
        userId: user1Id,
      } as any);

      const res = await request(app)
        .post(`/api/submissions/${submissionId.toString()}/votes`)
        .set("Authorization", "Bearer valid.token")
        .send({
          vote: "approve",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Participants cannot vote on their own submission");
    });

    it("prevents duplicate voting by the same voter with 409 Conflict", async () => {
      mockAuthAs(user2PrivyId);

      vi.spyOn(ChallengeModel, "findById").mockResolvedValue({
        _id: challengeId,
        status: "active",
      } as any);

      vi.spyOn(SubmissionModel, "findById").mockResolvedValue({
        _id: submissionId,
        challengeId,
        participantId,
      } as any);

      // Voter is user2
      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: user2Id,
        privyUserId: user2PrivyId,
      } as any);

      // Submitter is user1
      vi.spyOn(ParticipantModel, "findById").mockResolvedValue({
        _id: participantId,
        userId: user1Id,
      } as any);

      // Vote already exists
      vi.spyOn(VoteModel, "findOne").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        submissionId,
        voterId: user2Id,
      } as any);

      const res = await request(app)
        .post(`/api/submissions/${submissionId.toString()}/votes`)
        .set("Authorization", "Bearer valid.token")
        .send({
          vote: "approve",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("already voted on this submission");
    });

    it("successfully records vote when valid", async () => {
      mockAuthAs(user2PrivyId);

      vi.spyOn(ChallengeModel, "findById").mockResolvedValue({
        _id: challengeId,
        status: "active",
      } as any);

      vi.spyOn(SubmissionModel, "findById").mockResolvedValue({
        _id: submissionId,
        challengeId,
        participantId,
      } as any);

      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: user2Id,
        privyUserId: user2PrivyId,
      } as any);

      vi.spyOn(ParticipantModel, "findById").mockResolvedValue({
        _id: participantId,
        userId: user1Id,
      } as any);

      vi.spyOn(VoteModel, "findOne").mockResolvedValue(null);

      const createdVote = {
        _id: new mongoose.Types.ObjectId(),
        challengeId,
        submissionId,
        voterId: user2Id,
        vote: "approve",
        comment: "Great effort!",
      };
      vi.spyOn(VoteModel, "create").mockResolvedValue(createdVote as any);

      const res = await request(app)
        .post(`/api/submissions/${submissionId.toString()}/votes`)
        .set("Authorization", "Bearer valid.token")
        .send({
          vote: "approve",
          comment: "Great effort!",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vote).toBe("approve");
    });

    it("rejects vote when challenge is completed or cancelled with 400 Bad Request", async () => {
      mockAuthAs(user2PrivyId);

      vi.spyOn(SubmissionModel, "findById").mockResolvedValue({
        _id: submissionId,
        challengeId,
        participantId,
      } as any);

      vi.spyOn(ChallengeModel, "findById").mockResolvedValue({
        _id: challengeId,
        status: "completed",
      } as any);

      const res = await request(app)
        .post(`/api/submissions/${submissionId.toString()}/votes`)
        .set("Authorization", "Bearer valid.token")
        .send({
          vote: "approve",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Cannot vote on a challenge with status 'completed'");
    });

    it("handles concurrent duplicate vote error (code 11000) safely with 409 Conflict", async () => {
      mockAuthAs(user2PrivyId);

      vi.spyOn(SubmissionModel, "findById").mockResolvedValue({
        _id: submissionId,
        challengeId,
        participantId,
      } as any);

      vi.spyOn(ChallengeModel, "findById").mockResolvedValue({
        _id: challengeId,
        status: "active",
      } as any);

      vi.spyOn(UserModel, "findOneAndUpdate").mockResolvedValue({
        _id: user2Id,
        privyUserId: user2PrivyId,
      } as any);

      vi.spyOn(ParticipantModel, "findById").mockResolvedValue({
        _id: participantId,
        userId: user1Id,
      } as any);

      vi.spyOn(VoteModel, "findOne").mockResolvedValue(null);

      const mongoDupError: any = new Error("E11000 duplicate key error");
      mongoDupError.code = 11000;
      vi.spyOn(VoteModel, "create").mockRejectedValue(mongoDupError);

      const res = await request(app)
        .post(`/api/submissions/${submissionId.toString()}/votes`)
        .set("Authorization", "Bearer valid.token")
        .send({
          vote: "approve",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("already voted on this submission");
    });
  });
});
