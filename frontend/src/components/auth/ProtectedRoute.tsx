import type { ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Navigate } from "react-router-dom";
import { isDemoMode } from "../../services/apiClient";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { ready, authenticated } = usePrivy();

  if (!ready && !isDemoMode()) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div className="spinner" style={{ width: 24, height: 24, marginBottom: 16 }} />
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Initializing secure session…</p>
      </div>
    );
  }

  if (!authenticated && !isDemoMode()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
