import type {
  Challenge,
  Participant,
  Submission,
  Vote,
  ChatMessage,
  DashboardStats,
} from "../types/pactum";
import {
  DEMO_CHALLENGES,
  DEMO_PARTICIPANTS,
  DEMO_SUBMISSIONS,
  DEMO_CHAT_MESSAGES,
  DEMO_STATS,
} from "../data/mockDemoData";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("demo") === "true") return true;
  return sessionStorage.getItem("pactum_demo_mode") === "true";
}

export function setDemoMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    sessionStorage.setItem("pactum_demo_mode", "true");
  } else {
    sessionStorage.removeItem("pactum_demo_mode");
  }
}

/**
 * Resolves the backend base URL.
 * - In production: strictly uses import.meta.env.VITE_BACKEND_URL. Never falls back to localhost.
 * - In development: uses import.meta.env.VITE_BACKEND_URL, or defaults to "http://localhost:3001" for local DX.
 * - Normalizes the URL by trimming whitespace, stripping trailing slashes, and removing any trailing "/api"
 *   to prevent duplicate "/api/api" paths when joined with API endpoints.
 */
export function getBackendBaseUrl(): string {
  const rawUrl = import.meta.env.VITE_BACKEND_URL ? String(import.meta.env.VITE_BACKEND_URL).trim() : "";

  if (rawUrl) {
    let cleaned = rawUrl.replace(/\/+$/, "");
    if (cleaned.endsWith("/api")) {
      cleaned = cleaned.slice(0, -4).replace(/\/+$/, "");
    }

    // Warn if someone accidentally configured localhost in a production build
    if (import.meta.env.PROD && (cleaned.includes("localhost") || cleaned.includes("127.0.0.1"))) {
      console.warn(
        `[PACTUM API] Warning: VITE_BACKEND_URL is configured to localhost (${cleaned}) in a production build. ` +
        `This will cause ERR_CONNECTION_REFUSED in production. Configure your deployed backend URL in Vercel.`
      );
    }

    return cleaned;
  }

  // Local development fallback
  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }

  // In production with no VITE_BACKEND_URL configured
  return "";
}

/**
 * Builds the fully qualified request URL for an API endpoint.
 * Ensures clean joining without duplicate slashes or duplicate /api prefixes.
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getBackendBaseUrl();
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (!baseUrl) {
    if (import.meta.env.PROD) {
      throw new ApiError(
        500,
        "VITE_BACKEND_URL is not configured in Vercel environment variables. Please set VITE_BACKEND_URL in your Vercel frontend project settings to the deployed backend URL and redeploy.",
        "backend_url_unconfigured"
      );
    }
  }

  if (import.meta.env.PROD && (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1"))) {
    throw new ApiError(
      500,
      "VITE_BACKEND_URL is configured to localhost in your production environment. Please update VITE_BACKEND_URL in Vercel to your deployed backend URL and redeploy.",
      "invalid_production_backend_url"
    );
  }

  // Prevent duplicate /api/api if baseUrl ends with /api and endpoint starts with /api
  if (baseUrl.endsWith("/api") && normalizedEndpoint.startsWith("/api/")) {
    return `${baseUrl.slice(0, -4)}${normalizedEndpoint}`;
  }

  return `${baseUrl}${normalizedEndpoint}`;
}

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Token provider type allowing Privy hook to inject a fresh access token without storing it in localStorage
type TokenProvider = () => Promise<string | null>;
let currentTokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider | null) {
  currentTokenProvider = provider;
}

export function getTokenProvider(): TokenProvider | null {
  return currentTokenProvider;
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Centralized HTTP request dispatcher with error normalization,
 * safe non-JSON parsing, and dynamic Privy token resolution.
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = false, headers = {}, ...rest } = options;
  const url = buildApiUrl(endpoint);

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  // Only set Content-Type if there is a body and it's not FormData
  if (rest.body && typeof rest.body === "string" && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  // Obtain fresh access token if required or available
  if (requiresAuth || currentTokenProvider) {
    try {
      const token = currentTokenProvider ? await currentTokenProvider() : null;
      if (token) {
        requestHeaders["Authorization"] = `Bearer ${token.trim()}`;
      } else if (requiresAuth) {
        throw new ApiError(401, "Authentication session required", "unauthorized");
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(401, "Failed to retrieve access token", "token_retrieval_failed");
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });
  } catch (err: any) {
    // Catch network failures, timeouts, AbortError
    if (err.name === "AbortError") {
      throw err;
    }
    throw new ApiError(0, err.message || "Network request failed", "network_error");
  }

  // Handle non-JSON responses safely
  const contentType = response.headers.get("content-type") || "";
  let data: any = null;
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const status = response.status;
    let errorMessage = "An unexpected server error occurred";
    let errorCode = "server_error";
    let details: unknown = undefined;

    if (data && typeof data === "object") {
      errorMessage = data.message || data.error || errorMessage;
      errorCode = data.code || (typeof data.error === "string" ? data.error : errorCode);
      details = data.details || data.errors;
    } else if (typeof data === "string" && data.length > 0) {
      errorMessage = data;
    }

    throw new ApiError(status, errorMessage, errorCode, details);
  }

  return data as T;
}

// Event bus for real-time notifications
type EventCallback = (event: { type: string; payload: any }) => void;
const eventListeners: EventCallback[] = [];

export const pactumRealtime = {
  subscribe(callback: EventCallback) {
    eventListeners.push(callback);
    return () => {
      const idx = eventListeners.indexOf(callback);
      if (idx !== -1) eventListeners.splice(idx, 1);
    };
  },
  emit(type: string, payload: any) {
    for (const listener of eventListeners) {
      try {
        listener({ type, payload });
      } catch (err) {
        console.error("Error in real-time listener:", err);
      }
    }
  },
};

export interface BackendUser {
  id: string;
  privyUserId: string;
  walletAddress: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChallengeQueryParams {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * PACTUM Centralized API Client
 */
export const pactumApi = {
  /**
   * User Synchronization: GET /api/auth/me or GET /api/me
   */
  async getMe(signal?: AbortSignal): Promise<BackendUser> {
    const res = await request<{ success: boolean; user: BackendUser }>("/api/auth/me", {
      method: "GET",
      requiresAuth: true,
      signal,
    });
    return res.user;
  },

  /**
   * Public or Authenticated Challenges Listing: GET /api/challenges
   */
  async listChallenges(params?: ChallengeQueryParams, signal?: AbortSignal): Promise<{
    items: Challenge[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (isDemoMode()) {
      let filtered = [...DEMO_CHALLENGES];
      if (params?.status && params.status !== "all") {
        filtered = filtered.filter((c) => c.status === params.status);
      }
      if (params?.category) {
        filtered = filtered.filter((c) =>
          c.category.toLowerCase().includes(params.category!.toLowerCase())
        );
      }
      return {
        items: filtered,
        total: filtered.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
    }

    const query = new URLSearchParams();
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.category) query.set("category", params.category);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    const endpoint = `/api/challenges${qs ? `?${qs}` : ""}`;

    try {
      const res = await request<any>(endpoint, {
        method: "GET",
        signal,
      });

      const items = res.items || res.data?.items || res.data || [];
      return {
        items,
        total: res.total ?? items.length,
        page: res.page ?? 1,
        limit: res.limit ?? 20,
        totalPages: res.totalPages ?? 1,
      };
    } catch (err) {
      if (isDemoMode()) {
        return {
          items: DEMO_CHALLENGES,
          total: DEMO_CHALLENGES.length,
          page: 1,
          limit: 20,
          totalPages: 1,
        };
      }
      throw err;
    }
  },

  /**
   * Single Challenge Details: GET /api/challenges/:id
   */
  async getChallenge(id: string, signal?: AbortSignal): Promise<Challenge> {
    if (id.startsWith("demo-") || isDemoMode()) {
      const found = DEMO_CHALLENGES.find((c) => c._id === id);
      if (found) return found;
      if (isDemoMode() && DEMO_CHALLENGES[0]) return DEMO_CHALLENGES[0];
    }

    const res = await request<{ success: boolean; data: Challenge }>(`/api/challenges/${id}`, {
      method: "GET",
      signal,
    });
    return res.data;
  },

  /**
   * Create Challenge: POST /api/challenges (Authenticated)
   */
  async createChallenge(
    payload: {
      title: string;
      description: string;
      category: string;
      duration: number;
      startAt: string;
      endAt: string;
      stakeAmount: string;
      maximumParticipants?: number;
      imageUrl?: string | null;
    },
    signal?: AbortSignal
  ): Promise<Challenge> {
    const res = await request<{ success: boolean; data: Challenge }>("/api/challenges", {
      method: "POST",
      requiresAuth: true,
      body: JSON.stringify(payload),
      signal,
    });

    pactumRealtime.emit("challenge.created", res.data);
    return res.data;
  },

  /**
   * Update Challenge: PATCH /api/challenges/:id (Authenticated, Creator Only)
   */
  async updateChallenge(
    id: string,
    payload: Partial<{
      title: string;
      description: string;
      category: string;
      imageUrl: string | null;
      status: string;
    }>,
    signal?: AbortSignal
  ): Promise<Challenge> {
    const res = await request<{ success: boolean; data: Challenge }>(`/api/challenges/${id}`, {
      method: "PATCH",
      requiresAuth: true,
      body: JSON.stringify(payload),
      signal,
    });

    pactumRealtime.emit("challenge.updated", res.data);
    return res.data;
  },

  /**
   * Join Challenge: POST /api/challenges/:id/join (Authenticated)
   */
  async joinChallenge(
    id: string,
    walletAddress?: string,
    signal?: AbortSignal
  ): Promise<Participant> {
    if (id.startsWith("demo-") || isDemoMode()) {
      const demoPart: Participant = {
        _id: "part_joined_" + Math.random().toString(36).substring(2, 8),
        challengeId: id,
        userId: "current_user",
        displayName: "You",
        walletAddress: walletAddress || "0xMyWallet",
        joinedAt: new Date().toISOString(),
        status: "active",
        submissionCount: 0,
        todayStatus: "not_submitted",
      };
      pactumRealtime.emit("challenge.participant_joined", { challengeId: id, participant: demoPart });
      return demoPart;
    }

    const res = await request<{ success: boolean; data: Participant }>(`/api/challenges/${id}/join`, {
      method: "POST",
      requiresAuth: true,
      body: JSON.stringify({ walletAddress }),
      signal,
    });

    pactumRealtime.emit("challenge.participant_joined", { challengeId: id, participant: res.data });
    return res.data;
  },

  /**
   * List Participants: GET /api/challenges/:id/participants
   */
  async getParticipants(id: string, signal?: AbortSignal): Promise<Participant[]> {
    if (id.startsWith("demo-") || isDemoMode()) {
      return DEMO_PARTICIPANTS;
    }

    const res = await request<{ success: boolean; data: Participant[] }>(
      `/api/challenges/${id}/participants`,
      {
        method: "GET",
        signal,
      }
    );
    return res.data || [];
  },

  /**
   * Create Submission: POST /api/challenges/:id/submissions (Authenticated)
   */
  async createSubmission(
    challengeId: string,
    payload: { evidenceUrl: string; note?: string | null },
    signal?: AbortSignal
  ): Promise<Submission> {
    if (challengeId.startsWith("demo-") || isDemoMode()) {
      const newSub: Submission = {
        _id: "sub_demo_" + Math.random().toString(36).substring(2, 9),
        challengeId,
        participantId: "part_current_user",
        userId: "current_user",
        submitterName: "You",
        submitterWallet: "0xMyWallet",
        evidenceUrl: payload.evidenceUrl,
        note: payload.note || null,
        submittedAt: new Date().toISOString(),
        status: "pending",
        approvalsCount: 0,
        rejectionsCount: 0,
        pendingCount: 1,
        userVoted: null,
      };
      const key = `pactum_demo_submissions_${challengeId}`;
      try {
        const existing = await this.getSubmissions(challengeId);
        const updated = [newSub, ...existing];
        sessionStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      pactumRealtime.emit("submission.created", newSub);
      return newSub;
    }

    const res = await request<{ success: boolean; data: Submission }>(
      `/api/challenges/${challengeId}/submissions`,
      {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify(payload),
        signal,
      }
    );

    pactumRealtime.emit("submission.created", res.data);
    return res.data;
  },

  /**
   * Get Submissions: GET /api/challenges/:id/submissions
   */
  async getSubmissions(challengeId: string, signal?: AbortSignal): Promise<Submission[]> {
    if (challengeId.startsWith("demo-") || isDemoMode()) {
      const key = `pactum_demo_submissions_${challengeId}`;
      try {
        const stored = sessionStorage.getItem(key);
        if (stored) return JSON.parse(stored);
      } catch {}
      return DEMO_SUBMISSIONS;
    }

    const res = await request<{ success: boolean; data: Submission[] }>(
      `/api/challenges/${challengeId}/submissions`,
      {
        method: "GET",
        signal,
      }
    );
    return res.data || [];
  },

  /**
   * Cast Vote: POST /api/submissions/:id/votes (Authenticated)
   */
  async castVote(
    submissionId: string,
    payload: { vote: "approve" | "reject"; comment?: string | null },
    signal?: AbortSignal
  ): Promise<Vote> {
    if (submissionId.startsWith("sub_demo") || isDemoMode()) {
      const voteResult: Vote = {
        _id: "vote_" + Math.random().toString(36).substring(2, 9),
        submissionId,
        voterId: "current_user",
        voterWallet: "0xMyWallet",
        vote: payload.vote,
        comment: payload.comment || null,
        createdAt: new Date().toISOString(),
      };
      pactumRealtime.emit("submission.vote_updated", {
        submissionId,
        vote: voteResult,
      });
      return voteResult;
    }

    const res = await request<{ success: boolean; data: Vote }>(
      `/api/submissions/${submissionId}/votes`,
      {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify(payload),
        signal,
      }
    );

    pactumRealtime.emit("submission.vote_updated", { submissionId, vote: res.data });
    return res.data;
  },

  /**
   * Get Submission Votes: GET /api/submissions/:id/votes
   */
  async getSubmissionVotes(submissionId: string, signal?: AbortSignal): Promise<Vote[]> {
    const res = await request<{ success: boolean; data: Vote[] }>(
      `/api/submissions/${submissionId}/votes`,
      {
        method: "GET",
        signal,
      }
    );
    return res.data || [];
  },

  /**
   * Dashboard Statistics
   */
  async getDashboardStats(signal?: AbortSignal): Promise<DashboardStats> {
    if (isDemoMode()) {
      return DEMO_STATS;
    }
    try {
      const res = await this.listChallenges({ limit: 100 }, signal);
      const activeCount = res.items.filter((c) => c.status === "active" || c.status === "open").length;
      return {
        activeChallenges: activeCount,
        totalEarnings: "0.00 MON",
        currentStreak: 0,
      };
    } catch {
      return {
        activeChallenges: 0,
        totalEarnings: "0.00 MON",
        currentStreak: 0,
      };
    }
  },

  /**
   * Chat messages
   */
  async getChatMessages(challengeId: string): Promise<ChatMessage[]> {
    const key = `pactum_chat_${challengeId}`;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch {}

    if (challengeId.startsWith("demo-") || isDemoMode()) {
      return DEMO_CHAT_MESSAGES;
    }
    return [];
  },

  async sendChatMessage(challengeId: string, content: string, senderName: string): Promise<ChatMessage> {
    const key = `pactum_chat_${challengeId}`;
    const newMsg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      challengeId,
      senderId: "current_user",
      senderName,
      senderWallet: "0xMyWallet",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSelf: true,
    };

    try {
      const existing = await this.getChatMessages(challengeId);
      const updated = [...existing, newMsg];
      sessionStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // Ignore sessionStorage issues
    }

    pactumRealtime.emit("chat.message_created", newMsg);
    return newMsg;
  },
};
