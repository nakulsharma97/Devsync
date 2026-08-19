import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/sonner";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ThemeProvider } from "next-themes";
import "./index.css";

// Sentry error tracking (requires SENTRY_DSN env var)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

import { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import DashboardLayout from "@/components/DashboardLayout";
import AdminLayout from "@/components/AdminLayout";
import PageTransition from "@/components/PageTransition";
import { RouteSkeleton } from "@/components/Skeletons";
import Landing from "./pages/Landing";
import AuthPage from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";

// ── Route-level code splitting ────────────────────────────────
// Heavy feature pages (dashboard, feed, messages, kanban, …) plus the
// Recharts-heavy analytics and admin pages load only when first visited,
// keeping the initial bundle small (Landing + Auth + layout load eagerly).
// Deep links still work: the lazy chunks resolve on navigation and are cached
// in memory afterwards.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectWorkspace = lazy(() => import("./pages/ProjectWorkspace"));
const Messages = lazy(() => import("./pages/Messages"));
const BoardPage = lazy(() => import("./pages/BoardPage"));
const Profile = lazy(() => import("./pages/Profile"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const MyPosts = lazy(() => import("./pages/MyPosts"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Feed = lazy(() => import("./pages/Feed"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const NetworkPage = lazy(() => import("./pages/Network"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminProjects = lazy(() => import("./pages/AdminProjects"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AdminActivity = lazy(() => import("./pages/AdminActivity"));
const AdminAuditLogs = lazy(() => import("./pages/AdminAuditLogs"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
const AdminFeedback = lazy(() => import("./pages/AdminFeedback"));
const AdminBilling = lazy(() => import("./pages/AdminBilling"));
const AdminSupport = lazy(() => import("./pages/AdminSupport"));
const Support = lazy(() => import("./pages/Support"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <BrowserRouter>
        <AuthProvider>
          <PageTransition>
          <Suspense fallback={<RouteSkeleton />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<ProjectWorkspace />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:conversationId" element={<Messages />} />
              <Route path="/board/:projectId" element={<BoardPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/posts" element={<MyPosts />} />
              <Route path="/profile/:username" element={<UserProfilePage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/billing" element={<Billing />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/network" element={<NetworkPage />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/support" element={<Support />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
            </Route>
            {/* Admin routes with dedicated AdminLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                </ProtectedRoute>
              }
            >
              <Route path="/admin/dashboard" element={<Admin />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/projects" element={<AdminProjects />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/activity" element={<AdminActivity />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              <Route path="/admin/reviews" element={<AdminReviews />} />
              <Route path="/admin/feedback" element={<AdminFeedback />} />
              <Route path="/admin/billing" element={<AdminBilling />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              <Route path="/admin/profile" element={<Profile />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </PageTransition>
        </AuthProvider>
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
