import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowLeft,
  MessageSquare,
  FileCheck,
  Plus,
  Send,
  Clock,
  Users,
  Trophy,
  AlertCircle,
  Wifi,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import SubmissionModal from "../components/challenges/SubmissionModal";
import VoteControls from "../components/challenges/VoteControls";
import { pactumApi, pactumRealtime } from "../services/apiClient";
import type { Challenge, Submission, ChatMessage, Participant } from "../types/pactum";

interface ChallengeWorkspaceProps {
  initialTab?: "chat" | "submissions";
}

export function ChallengeWorkspacePage({ initialTab = "submissions" }: ChallengeWorkspaceProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = usePrivy();

  const [activeTab, setActiveTab] = useState<"chat" | "submissions">(initialTab);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const googleAccount = user?.linkedAccounts?.find((acc) => acc.type === "google_oauth");
  const currentUserName =
    (googleAccount && "name" in googleAccount && googleAccount.name) || "You";

  const loadWorkspaceData = async () => {
    if (!id) return;
    try {
      const [chalData, subsData, msgsData, partsData] = await Promise.all([
        pactumApi.getChallenge(id),
        pactumApi.getSubmissions(id),
        pactumApi.getChatMessages(id),
        pactumApi.getParticipants(id),
      ]);
      setChallenge(chalData);
      setSubmissions(subsData);
      setMessages(msgsData);
      setParticipants(partsData);
    } catch (err) {
      console.error("Error loading workspace data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspaceData();

    // Subscribe to real-time events for instant live updates across peers
    const unsubscribe = pactumRealtime.subscribe(({ type, payload }) => {
      if (type === "chat.message_created" && payload.challengeId === id) {
        setMessages((prev) => [...prev, payload]);
      } else if (type === "submission.created" && payload.challengeId === id) {
        setSubmissions((prev) => [payload, ...prev]);
      } else if (type === "submission.vote_updated" && payload.submissionId) {
        setSubmissions((prev) =>
          prev.map((s) => (s._id === payload.submissionId ? payload.sub || s : s))
        );
      }
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage("");

    await pactumApi.sendChatMessage(id, content, currentUserName);
  };

  const handleUploadSubmission = async (evidenceUrl: string, caption: string) => {
    if (!id) return;
    await pactumApi.createSubmission(id, {
      evidenceUrl,
      note: caption || null,
    });
    void loadWorkspaceData();
  };

  const handleVote = async (submissionId: string, choice: "approve" | "reject") => {
    await pactumApi.castVote(submissionId, {
      vote: choice,
    });
    void loadWorkspaceData();
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-muted)" }}>
          <div className="spinner" style={{ width: 24, height: 24, marginBottom: 12 }} />
          <div>Entering challenge workspace…</div>
        </div>
      </AppLayout>
    );
  }

  if (!challenge) {
    return (
      <AppLayout>
        <div className="pactum-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h2>Challenge Not Found</h2>
          <button type="button" onClick={() => navigate("/dashboard")} className="pactum-btn-primary">
            Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        {/* Navigation & Results Link */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="pactum-btn-secondary"
            style={{ padding: "6px 12px", fontSize: 12 }}
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>

          <Link
            to={`/challenges/${challenge._id}/results`}
            className="pactum-btn-secondary"
            style={{ padding: "6px 12px", fontSize: 12, color: "var(--color-primary-dark)" }}
            id="viewResultsBtn"
          >
            <Trophy size={14} />
            <span>View Results</span>
          </Link>
        </div>

        {/* Compact Challenge Workspace Summary */}
        <div className="pactum-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            <span className="pactum-topic-pill" style={{ margin: 0 }}>{challenge.category}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--color-success)", fontWeight: 700 }}>
              <Wifi size={13} /> Live Sync
            </div>
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px", color: "var(--color-text)" }}>
            {challenge.title}
          </h1>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "var(--color-text-muted)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={13} color="var(--color-primary-dark)" />
              <span>{challenge.duration} Days</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Users size={13} color="var(--color-primary-dark)" />
              <span>{challenge.participantCount || 12} / {challenge.maximumParticipants || 15} Participants</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={13} color="var(--color-warning)" />
              <span>Daily Deadline: {challenge.dailyDeadline || "10:00 PM"}</span>
            </div>
          </div>
        </div>

        {/* Workspace Mobile-first Tabs */}
        <div className="pactum-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "submissions"}
            onClick={() => setActiveTab("submissions")}
            className={`pactum-tab-btn ${activeTab === "submissions" ? "active" : ""}`}
            id="tabSubmissions"
          >
            <FileCheck size={16} />
            <span>Submission Center</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
            className={`pactum-tab-btn ${activeTab === "chat" ? "active" : ""}`}
            id="tabChat"
          >
            <MessageSquare size={16} />
            <span>Chat ({messages.length})</span>
          </button>
        </div>

        {/* Tab 1: Submission Center */}
        {activeTab === "submissions" && (
          <div>
            {/* Header with Upload CTA */}
            <div className="pactum-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, background: "var(--gradient-card)" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary-dark)", textTransform: "uppercase" }}>
                  Today's Progress
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text)", marginTop: 2 }}>
                  Daily Evidence Review
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="pactum-btn-primary"
                id="uploadSubmissionTopBtn"
              >
                <Plus size={16} />
                <span>Upload Submission</span>
              </button>
            </div>

            {/* Submissions List */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 12px", color: "var(--color-text)" }}>
                Peer Submissions ({submissions.length})
              </h3>

              {submissions.length === 0 ? (
                <div className="pactum-card" style={{ textAlign: "center", padding: "30px 20px" }}>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 14px" }}>
                    No submissions uploaded for today yet. Be the first to submit your evidence!
                  </p>
                  <button type="button" onClick={() => setIsUploadOpen(true)} className="pactum-btn-primary">
                    Upload Now
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {submissions.map((sub) => {
                    const isSelf = sub.userId === "current_user" || sub.submitterName === "You";
                    return (
                      <div key={sub._id} className="pactum-card" id={`submission-item-${sub._id}`}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text)" }}>
                              {sub.submitterName || "Participant"}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: 8 }}>
                              {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <span
                            className={`pactum-badge ${
                              sub.status === "approved"
                                ? "pactum-badge-active"
                                : sub.status === "rejected"
                                ? "pactum-badge-closed"
                                : "pactum-badge-pending"
                            }`}
                          >
                            ● {sub.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Image Preview */}
                        <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 10, border: "1px solid var(--color-border)", maxHeight: 280 }}>
                          <img
                            src={sub.evidenceUrl}
                            alt="Submission Evidence"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        </div>

                        {sub.note && (
                          <p style={{ fontSize: 13, color: "var(--color-text)", margin: "0 0 10px", lineHeight: 1.5 }}>
                            {sub.note}
                          </p>
                        )}

                        {/* Peer Voting & Review Controls */}
                        <VoteControls
                          submission={sub}
                          isSelf={isSelf}
                          onVote={(choice) => handleVote(sub._id, choice)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Participant Submission Timeline */}
            <div className="pactum-card">
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 12px", color: "var(--color-text)" }}>
                Participant Status Timeline
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {participants.map((p) => {
                  const statusLabel =
                    p.todayStatus === "approved"
                      ? "Approved"
                      : p.todayStatus === "pending_review"
                      ? "Pending Review"
                      : "Not Submitted";

                  const badgeClass =
                    p.todayStatus === "approved"
                      ? "pactum-badge-active"
                      : p.todayStatus === "pending_review"
                      ? "pactum-badge-pending"
                      : "";

                  return (
                    <div
                      key={p._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        background: "#f8fbfe",
                        borderRadius: 10,
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                          {(p.displayName || "P")[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                            {p.displayName || "Participant"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                            {p.walletAddress}
                          </div>
                        </div>
                      </div>

                      <span className={`pactum-badge ${badgeClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Chat */}
        {activeTab === "chat" && (
          <div className="pactum-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "65vh" }}>
            {/* Messages Area */}
            <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", margin: "auto", color: "var(--color-text-muted)", fontSize: 13 }}>
                  No messages yet. Say hello to your pool participants!
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.isSelf || m.senderName === "You" || m.senderName === currentUserName;
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isMe ? "flex-end" : "flex-start",
                        maxWidth: "75%",
                      }}
                    >
                      <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 2, textAlign: isMe ? "right" : "left", fontWeight: 700 }}>
                        {isMe ? "You" : m.senderName} · {m.timestamp}
                      </div>
                      <div
                        style={{
                          background: isMe ? "var(--gradient-primary)" : "var(--color-primary-soft)",
                          color: isMe ? "#fff" : "var(--color-text)",
                          padding: "10px 14px",
                          borderRadius: 14,
                          fontSize: 13,
                          lineHeight: 1.4,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                        }}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--color-border)", background: "#fff" }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message to pool peers..."
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)",
                  fontSize: 13,
                  outline: "none",
                }}
                id="chatMessageInput"
              />
              <button
                type="submit"
                className="pactum-btn-primary"
                style={{ padding: "10px 16px" }}
                id="chatSendBtn"
              >
                <Send size={15} />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* Submission Upload Modal */}
        <SubmissionModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSubmit={handleUploadSubmission}
        />
      </div>
    </AppLayout>
  );
}

export default ChallengeWorkspacePage;
