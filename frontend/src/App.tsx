import { Routes, Route } from "react-router-dom";
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

export function App() {
  return (
    <Routes>
      {/* Public Landing & Login */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LandingPage />} />

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

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
