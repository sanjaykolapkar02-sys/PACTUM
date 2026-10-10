import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  pactumApi,
  setTokenProvider,
  ApiError,
  pactumRealtime,
  getBackendBaseUrl,
  buildApiUrl,
} from "../services/apiClient";

describe("Frontend Centralized API Client & Service Integration Suite", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    setTokenProvider(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setTokenProvider(null);
  });

  describe("Authentication Headers & Session Resolution", () => {
    it("includes Authorization: Bearer <token> header when token provider returns token", async () => {
      setTokenProvider(async () => "test-jwt-token-12345");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          user: {
            id: "user_123",
            privyUserId: "did:privy:123",
            walletAddress: "0x1234567890123456789012345678901234567890",
            displayName: "Test User",
            email: "test@example.com",
            avatarUrl: null,
          },
        }),
      });
      globalThis.fetch = mockFetch;

      const user = await pactumApi.getMe();
      expect(user.id).toBe("user_123");
      expect(user.privyUserId).toBe("did:privy:123");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/auth/me");
      expect(init.headers["Authorization"]).toBe("Bearer test-jwt-token-12345");
      expect(init.headers["Accept"]).toBe("application/json");
    });

    it("rejects with 401 ApiError when authenticated endpoint is called without token provider", async () => {
      setTokenProvider(null);

      await expect(pactumApi.getMe()).rejects.toThrow(ApiError);
      await expect(pactumApi.getMe()).rejects.toMatchObject({
        status: 401,
        code: "unauthorized",
      });
    });

    it("allows unauthenticated public challenge listing without Authorization header", async () => {
      setTokenProvider(null);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          items: [
            {
              _id: "chal_public_1",
              title: "Public Challenge",
              description: "Open to explore",
              category: "DSA",
              duration: 7,
              startAt: new Date().toISOString(),
              endAt: new Date().toISOString(),
              stakeAmount: "5000000000000000000",
              creatorId: "user_creator",
              status: "open",
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      });
      globalThis.fetch = mockFetch;

      const res = await pactumApi.listChallenges({ status: "open" });
      expect(res.items.length).toBe(1);
      expect(res.items[0].title).toBe("Public Challenge");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["Authorization"]).toBeUndefined();
    });
  });

  describe("Error Response Normalization", () => {
    it("normalizes HTTP 400 Bad Request responses with code and message", async () => {
      setTokenProvider(async () => "valid-token");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: false,
          error: "bad_request",
          message: "Participants cannot vote on their own submission",
        }),
      });

      await expect(
        pactumApi.castVote("sub_self", { vote: "approve" })
      ).rejects.toMatchObject({
        status: 400,
        message: "Participants cannot vote on their own submission",
        code: "bad_request",
      });
    });

    it("normalizes HTTP 409 Conflict responses for duplicate join or voting", async () => {
      setTokenProvider(async () => "valid-token");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: false,
          error: "already_voted",
          message: "You have already voted on this submission",
        }),
      });

      await expect(
        pactumApi.castVote("sub_dup", { vote: "approve" })
      ).rejects.toMatchObject({
        status: 409,
        code: "already_voted",
        message: "You have already voted on this submission",
      });
    });

    it("normalizes HTTP 404 Not Found responses", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: false,
          error: "not_found",
          message: "Challenge not found",
        }),
      });

      await expect(pactumApi.getChallenge("non_existent_id")).rejects.toMatchObject({
        status: 404,
        message: "Challenge not found",
      });
    });

    it("handles non-JSON error responses gracefully without crashing JSON parser", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => "Bad Gateway Error from proxy",
      });

      await expect(pactumApi.listChallenges()).rejects.toMatchObject({
        status: 502,
        message: "Bad Gateway Error from proxy",
      });
    });
  });

  describe("Challenge Creation & Joining Contract", () => {
    it("creates challenge sending integer base-unit stakeAmount string", async () => {
      setTokenProvider(async () => "valid-token");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: {
            _id: "chal_new_99",
            title: "5K Daily Run",
            description: "Morning outdoor runs",
            category: "Fitness",
            duration: 7,
            startAt: "2026-10-10T10:00:00.000Z",
            endAt: "2026-10-17T10:00:00.000Z",
            stakeAmount: "5000000000000000000",
            status: "open",
            maximumParticipants: 10,
          },
        }),
      });
      globalThis.fetch = mockFetch;

      const eventSpy = vi.fn();
      const unsub = pactumRealtime.subscribe(eventSpy);

      const created = await pactumApi.createChallenge({
        title: "5K Daily Run",
        description: "Morning outdoor runs",
        category: "Fitness",
        duration: 7,
        startAt: "2026-10-10T10:00:00.000Z",
        endAt: "2026-10-17T10:00:00.000Z",
        stakeAmount: "5000000000000000000",
        maximumParticipants: 10,
        imageUrl: null,
      });

      unsub();

      expect(created._id).toBe("chal_new_99");
      expect(created.stakeAmount).toBe("5000000000000000000");

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/challenges");
      expect(init.method).toBe("POST");
      const sentBody = JSON.parse(init.body);
      expect(sentBody.stakeAmount).toBe("5000000000000000000");
      expect(sentBody.category).toBe("Fitness");

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "challenge.created" })
      );
    });

    it("joins challenge and emits participant joined event", async () => {
      setTokenProvider(async () => "valid-token");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: {
            _id: "part_99",
            challengeId: "chal_new_99",
            userId: "user_joiner",
            walletAddress: "0x1234567890123456789012345678901234567890",
            joinedAt: new Date().toISOString(),
            status: "active",
          },
        }),
      });
      globalThis.fetch = mockFetch;

      const eventSpy = vi.fn();
      const unsub = pactumRealtime.subscribe(eventSpy);

      const participant = await pactumApi.joinChallenge(
        "chal_new_99",
        "0x1234567890123456789012345678901234567890"
      );

      unsub();

      expect(participant._id).toBe("part_99");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/challenges/chal_new_99/join"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            walletAddress: "0x1234567890123456789012345678901234567890",
          }),
        })
      );
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "challenge.participant_joined" })
      );
    });
  });

  describe("Submissions & Peer Voting API Integration", () => {
    it("submits evidence URL and note successfully", async () => {
      setTokenProvider(async () => "valid-token");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: {
            _id: "sub_new_1",
            challengeId: "chal_1",
            participantId: "part_1",
            evidenceUrl: "https://strava.com/activities/998877",
            note: "Completed 5km morning run",
            submittedAt: new Date().toISOString(),
            status: "pending",
          },
        }),
      });
      globalThis.fetch = mockFetch;

      const res = await pactumApi.createSubmission("chal_1", {
        evidenceUrl: "https://strava.com/activities/998877",
        note: "Completed 5km morning run",
      });

      expect(res._id).toBe("sub_new_1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/challenges/chal_1/submissions"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            evidenceUrl: "https://strava.com/activities/998877",
            note: "Completed 5km morning run",
          }),
        })
      );
    });

    it("casts peer verification vote successfully", async () => {
      setTokenProvider(async () => "valid-token");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: {
            _id: "vote_1",
            submissionId: "sub_1",
            vote: "approve",
            comment: "Valid GPS track",
            createdAt: new Date().toISOString(),
          },
        }),
      });
      globalThis.fetch = mockFetch;

      const vote = await pactumApi.castVote("sub_1", {
        vote: "approve",
        comment: "Valid GPS track",
      });

      expect(vote._id).toBe("vote_1");
      expect(vote.vote).toBe("approve");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/submissions/sub_1/votes"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            vote: "approve",
            comment: "Valid GPS track",
          }),
        })
      );
    });
  });

  describe("Backend URL Normalization & Production Safety", () => {
    it("normalizes endpoints without duplicate /api prefixes when baseUrl has trailing /api", () => {
      const originalEnv = import.meta.env.VITE_BACKEND_URL;
      (import.meta.env as any).VITE_BACKEND_URL = "https://pactum-backend.vercel.app/api";

      try {
        expect(getBackendBaseUrl()).toBe("https://pactum-backend.vercel.app");
        const url = buildApiUrl("/api/auth/me");
        expect(url).toBe("https://pactum-backend.vercel.app/api/auth/me");
        expect(url).not.toContain("/api/api");
      } finally {
        (import.meta.env as any).VITE_BACKEND_URL = originalEnv;
      }
    });

    it("strips trailing slashes from baseUrl", () => {
      const originalEnv = import.meta.env.VITE_BACKEND_URL;
      (import.meta.env as any).VITE_BACKEND_URL = "https://pactum-backend.vercel.app///";

      try {
        const url = buildApiUrl("/api/challenges");
        expect(url).toBe("https://pactum-backend.vercel.app/api/challenges");
        expect(url).not.toContain("///");
      } finally {
        (import.meta.env as any).VITE_BACKEND_URL = originalEnv;
      }
    });

    it("ensures leading slash on endpoints without one", () => {
      const originalEnv = import.meta.env.VITE_BACKEND_URL;
      (import.meta.env as any).VITE_BACKEND_URL = "https://pactum-backend.vercel.app";

      try {
        const url = buildApiUrl("api/challenges");
        expect(url).toBe("https://pactum-backend.vercel.app/api/challenges");
      } finally {
        (import.meta.env as any).VITE_BACKEND_URL = originalEnv;
      }
    });
  });
});
