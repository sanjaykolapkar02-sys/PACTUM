import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";

export function NotFoundPage() {
  return (
    <AppLayout>
      <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center" }}>
        <div className="pactum-card" style={{ padding: "40px 24px" }}>
          <AlertCircle size={44} color="var(--color-primary-dark)" style={{ margin: "0 auto 16px" }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", color: "var(--color-text)" }}>
            Page Not Found
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 24px" }}>
            The requested page does not exist or may have been moved.
          </p>
          <Link to="/dashboard" className="pactum-btn-primary" id="returnDashboard404">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

export default NotFoundPage;
