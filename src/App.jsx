import { Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import SkillSystemPage from './pages/SkillSystemPage';
import SkillProgressPage from './pages/SkillProgressPage';
import { Routes, Route } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-text">Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-text">Loading…</div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function AppShell() {
  return (
    <ProgressProvider>
      <ThemeProvider>
        <AppLayout />
      </ThemeProvider>
    </ProgressProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="skill-system" element={<SkillSystemPage />} />
        <Route path="skills" element={<SkillSystemPage hash="#skills" />} />
        <Route path="projects" element={<SkillSystemPage hash="#projects" />} />
        <Route path="gates" element={<SkillSystemPage hash="#gates" />} />
        <Route path="skill-progress" element={<SkillProgressPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="today" element={<Navigate to="/" replace />} />
        <Route path="calendar" element={<Navigate to="/" replace />} />
        <Route path="roadmap" element={<Navigate to="/" replace />} />
        <Route path="progress" element={<Navigate to="/" replace />} />
        <Route path="bookmarks" element={<Navigate to="/" replace />} />
        <Route path="stats" element={<Navigate to="/" replace />} />
        <Route path="plan" element={<Navigate to="/" replace />} />
        <Route path="lists" element={<Navigate to="/" replace />} />
        <Route path="search" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
