import { useState, useEffect, useRef } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (evidenceUrl: string, caption: string) => Promise<void>;
}

export function SubmissionModal({ isOpen, onClose, onSubmit }: SubmissionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount or file change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds maximum limit of 5MB.");
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !previewUrl) {
      setError("Please select an evidence image to upload.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      // When backend object storage is wired up, this URL will come from S3/backend presigned upload.
      // For reliable rendering, use the previewUrl or safe hosted sample evidence URL:
      const evidenceUrl =
        previewUrl ||
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80";
      await onSubmit(evidenceUrl, caption);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to upload submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pactum-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="uploadModalTitle">
      <div className="pactum-modal-box" style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 id="uploadModalTitle" style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--color-text)" }}>
            Upload Submission
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* File Picker & Preview */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              style={{ display: "none" }}
              id="evidenceFileInput"
            />

            {previewUrl ? (
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border)" }}>
                <img
                  src={previewUrl}
                  alt="Evidence preview"
                  style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="pactum-btn-secondary"
                  style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(255,255,255,0.9)" }}
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed var(--color-border)",
                  borderRadius: 16,
                  padding: "36px 20px",
                  textAlign: "center",
                  background: "var(--color-background)",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                id="selectImageDropzone"
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "var(--color-primary-dark)" }}>
                  <ImageIcon size={22} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                  Select Image
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  PNG, JPG or WEBP up to 5MB
                </div>
              </div>
            )}
          </div>

          {/* Caption */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>
              Caption
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe your progress (e.g. Problems solved, workout route, pages read)..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-button)",
                border: "1px solid var(--color-border)",
                fontSize: 13,
                boxSizing: "border-box",
                resize: "vertical",
              }}
              id="submissionCaptionInput"
            />
          </div>

          {error && (
            <div style={{ color: "var(--color-danger)", fontSize: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="pactum-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="pactum-btn-primary"
              id="submitEvidenceBtn"
            >
              <Upload size={15} />
              <span>{isSubmitting ? "Uploading..." : "Submit Evidence"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SubmissionModal;
