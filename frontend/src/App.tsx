import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { setTokenProvider, setDemoMode } from "./services/apiClient";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import BrowseChallengesPage from "./pages/BrowseChallengesPage";
import CreateChallengePage from "./pages/CreateChallengePage";
import ChallengeDetailsPage from "./pages/ChallengeDetailsPage";
import ChallengeWorkspacePage from "./pages/ChallengeWorkspacePage";
import ChallengeResultsPage from "./pages/ChallengeResultsPage";
import ActiveChallengesPage from "./pages/ActiveChallengesPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";

function DemoRouteHandler() {
  useEffect(() => {
    setDemoMode(true);
  }, []);
  return <Navigate to="/dashboard?demo=true" replace />;
}

function PrivyTokenSync() {
  const { ready, authenticated, getAccessToken } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      setTokenProvider(async () => {
        try {
          return await getAccessToken();
        } catch {
          return null;
        }
      });
    } else {
      setTokenProvider(null);
    }
  }, [ready, authenticated, getAccessToken]);

  return null;
}

export function App() {
  return (
    <>
      <PrivyTokenSync />
      <Routes>
      {/* Public Landing & Login & Demo Route */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LandingPage />} />
      <Route path="/demo" element={<DemoRouteHandler />} />

      {/* Authenticated Application Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenges"
        element={
          <ProtectedRoute>
            <BrowseChallengesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenges/create"
        element={
          <ProtectedRoute>
            <CreateChallengePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenges/:id"
        element={
          <ProtectedRoute>
            <ChallengeDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenges/:id/room"
        element={
          <ProtectedRoute>
            <ChallengeWorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenges/:id/chat"
        element={
          <ProtectedRoute>
            <ChallengeWorkspacePage initialTab="chat" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenges/:id/submissions"
        element={
          <ProtectedRoute>
            <ChallengeWorkspacePage initialTab="submissions" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenges/:id/results"
        element={
          <ProtectedRoute>
            <ChallengeResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/active"
        element={
          <ProtectedRoute>
            <ActiveChallengesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faucet"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </>
  );
}

export default App;
