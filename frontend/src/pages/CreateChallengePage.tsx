import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { parseEther } from "viem";
import { ArrowLeft, Sparkles, DollarSign } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import FeeModal from "../components/challenges/FeeModal";
import { pactumApi, setTokenProvider } from "../services/apiClient";

export function CreateChallengePage() {
  const navigate = useNavigate();
  const { ready, authenticated, getAccessToken } = usePrivy();

  // Ensure fresh Privy token provider is wired
  useEffect(() => {
    if (ready && authenticated) {
      setTokenProvider(async () => {
        try {
          return await getAccessToken();
        } catch {
          return null;
        }
      });
    }
  }, [ready, authenticated, getAccessToken]);

  // 01. Challenge Information
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // 02. Rules
  const [specificRules, setSpecificRules] = useState("");
  const [submissionRules, setSubmissionRules] = useState("");

  // 03. Duration & Schedule
  const [duration, setDuration] = useState(7);
  const [submissionSchedule, setSubmissionSchedule] = useState("08:00 AM – 10:00 AM, 09:00 PM – 10:00 PM");
  const [dailyDeadline, setDailyDeadline] = useState("10:00 PM");

  // 04. Participants
  const [maximumParticipants, setMaximumParticipants] = useState(10);

  // 05. Entry Fee
  const [stakeAmount, setStakeAmount] = useState("5.00");
  const [tokenSymbol, setTokenSymbol] = useState("MON");
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);

  // 06. Confirmation
  const [agreeRules, setAgreeRules] = useState(false);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!topic.trim()) {
      setError("Please enter a challenge topic (e.g. DSA, Reading, Coding).");
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      setError("Challenge name must be at least 3 characters.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }
    if (!agreeRules) {
      setError("Please check the confirmation box agreeing to the challenge rules to proceed.");
      return;
    }

    try {
      setIsSubmitting(true);

      const startAt = new Date().toISOString();
      const endAt = new Date(Date.now() + duration * 86400000).toISOString();
      
      // Calculate integer base-unit string without JavaScript floating-point math
      let baseStakeAmount: string;
      try {
        const cleanedAmount = (stakeAmount || "5.00").trim().replace(",", ".");
        const parsed = parseEther(cleanedAmount);
        if (parsed <= 0n) {
          setError("Stake amount must be greater than zero.");
          setIsSubmitting(false);
          return;
        }
        baseStakeAmount = parsed.toString();
      } catch {
        setError("Please enter a valid numeric stake amount (e.g. 5.00).");
        setIsSubmitting(false);
        return;
      }

      const created = await pactumApi.createChallenge({
        title: title.trim(),
        description: description.trim(),
        category: topic.trim(),
        duration,
        startAt,
        endAt,
        stakeAmount: baseStakeAmount,
        maximumParticipants,
        imageUrl: null,
      });

      navigate(`/challenges/${created._id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create challenge. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Navigation back */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="pactum-btn-secondary"
          style={{ marginBottom: 16, padding: "6px 12px", fontSize: 12 }}
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: "var(--color-text)", letterSpacing: "-0.03em" }}>
            Create Challenge
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Configure your custom habit pool, duration, review windows, and commitment stake.
          </p>
        </div>

        {error && (
          <div style={{ background: "#fce8ea", border: "1px solid var(--color-danger)", color: "var(--color-danger)", padding: "12px 16px", borderRadius: "var(--radius-button)", marginBottom: 20, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 01. Challenge Information */}
          <div className="pactum-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                01
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                Challenge Information
              </h2>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
                Topic <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter your topic (e.g. DSA, Reading, Coding, Fitness, Meditation)"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
                id="challengeTopicInput"
              />
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, display: "block" }}>
                User-defined topic. Predefined category blocks are not forced.
              </span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
                Challenge Name <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Solve 3 DSA Problems Every Day"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
                id="challengeTitleInput"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
                Description <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose, expectations, and commitment required..."
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)",
                  fontSize: 14,
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
                id="challengeDescriptionInput"
              />
            </div>
          </div>

          {/* 02. Rules */}
          <div className="pactum-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                02
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                Rules & Verification
              </h2>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
                Specific Rules
              </label>
              <textarea
                rows={2}
                value={specificRules}
                onChange={(e) => setSpecificRules(e.target.value)}
                placeholder="Enter specific rules (e.g. Solve LeetCode medium/hard, 25 pages without phone distraction)"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
                id="challengeSpecificRulesInput"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
                Submission Rules
              </label>
              <textarea
                rows={2}
                value={submissionRules}
                onChange={(e) => setSubmissionRules(e.target.value)}
                placeholder="Explain what participants must submit (e.g. Screenshot of accepted submission with timestamp)"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
                id="challengeSubmissionRulesInput"
              />
            </div>
          </div>

          {/* 03. Duration & Schedule */}
          <div className="pactum-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                03
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                Duration & Schedule
              </h2>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--color-text)" }}>
                Challenge Duration
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[1, 3, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDuration(days)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: "1px solid",
                      borderColor: duration === days ? "var(--color-primary-dark)" : "var(--color-border)",
                      background: duration === days ? "var(--color-primary-soft)" : "#fff",
                      color: duration === days ? "var(--color-primary-dark)" : "var(--color-text)",
                      fontWeight: duration === days ? 700 : 500,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {days === 1 ? "24 Hours" : `${days} Days`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
                Daily Submission Schedule / Windows
              </label>
              <input
                type="text"
                value={submissionSchedule}
                onChange={(e) => setSubmissionSchedule(e.target.value)}
                placeholder="e.g. 08:00 AM – 10:00 AM, 09:00 PM – 10:00 PM"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
                id="submissionScheduleInput"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
                Daily Submission Deadline
              </label>
              <input
                type="text"
                value={dailyDeadline}
                onChange={(e) => setDailyDeadline(e.target.value)}
                placeholder="e.g. 10:00 PM (Local Time)"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
                id="submissionDeadlineInput"
              />
            </div>
          </div>

          {/* 04. Participants */}
          <div className="pactum-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                04
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                Maximum Participants
              </h2>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
                Participant Capacity (2 – 15)
              </label>
              <select
                value={maximumParticipants}
                onChange={(e) => setMaximumParticipants(parseInt(e.target.value, 10))}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)",
                  fontSize: 14,
                  background: "#fff",
                  boxSizing: "border-box",
                }}
                id="maxParticipantsSelect"
              >
                {Array.from({ length: 14 }, (_, i) => i + 2).map((num) => (
                  <option key={num} value={num}>
                    {num} Participants
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 05. Entry Fee */}
          <div className="pactum-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                05
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                Entry Fee
              </h2>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-primary-soft)", padding: "14px 18px", borderRadius: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>Configured Stake Amount</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-primary-dark)" }}>
                  {stakeAmount} {tokenSymbol}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFeeModalOpen(true)}
                className="pactum-btn-secondary"
                id="setEntryFeeBtn"
              >
                <DollarSign size={15} />
                <span>Set Entry Fee</span>
              </button>
            </div>
          </div>

          {/* 06. Confirmation & Submit */}
          <div className="pactum-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--color-primary-soft)", color: "var(--color-primary-dark)", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                06
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                Confirmation
              </h2>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--color-text)", marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={agreeRules}
                onChange={(e) => {
                  setAgreeRules(e.target.checked);
                  if (e.target.checked && error.includes("confirmation box")) {
                    setError("");
                  }
                }}
                style={{ width: 18, height: 18, cursor: "pointer" }}
                id="agreeRulesCheckbox"
              />
              <span>I agree to the challenge rules, submission deadlines, and peer review terms.</span>
            </label>

            {error && (
              <div
                style={{
                  background: "#fce8ea",
                  border: "1px solid var(--color-danger)",
                  color: "var(--color-danger)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-button)",
                  marginBottom: 14,
                  fontSize: 13,
                }}
                role="alert"
                id="createChallengeErrorNotice"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="pactum-btn-primary"
              style={{ width: "100%", padding: "14px", fontSize: 15 }}
              id="createChallengeSubmitBtn"
            >
              <Sparkles size={17} />
              <span>{isSubmitting ? "Creating Challenge…" : "Create Challenge"}</span>
            </button>
          </div>
        </form>

        {/* Amount configuration modal */}
        <FeeModal
          isOpen={isFeeModalOpen}
          initialAmount={stakeAmount}
          initialToken={tokenSymbol}
          onClose={() => setIsFeeModalOpen(false)}
          onConfirm={(amount, token) => {
            setStakeAmount(amount);
            setTokenSymbol(token);
          }}
        />
      </div>
    </AppLayout>
  );
}

export default CreateChallengePage;
