import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, lazy, useCallback } from "react";

// Direct import for Landing (avoids stale dynamic chunk cache issues)
import Landing from "./pages/Landing.tsx";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { ThemeProvider } from "next-themes";
import "./index.css";
import "./types/global.d.ts";

// Dev-only: expose test utilities on window for console testing
// Add ?__test=1 to the URL to enable in production/Freebuff preview
if (import.meta.env.DEV || location.search.includes("__test=1")) {
  import("./dev/test-project-creation.ts").then((mod) => mod.default());
}

// DevSync Auth & Layout
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";

// Direct imports for pages (avoids Freebuff preview dynamic import issues)
import AuthPage from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Profile from "./pages/Profile.tsx";
import Projects from "./pages/Projects.tsx";
import Feed from "./pages/Feed.tsx";
import Teams from "./pages/Teams.tsx";
import Notifications from "./pages/Notifications.tsx";
import Bookmarks from "./pages/Bookmarks.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import Settings from "./pages/Settings.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

/** Enable theme transitions after initial paint to avoid flash on load */
function ThemeBootstrap() {
  useEffect(() => {
    // Small delay ensures the first paint happens before transitions activate
    const id = requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-ready");
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location}>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
      
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ConvexAuthProvider client={convex}>
          <BrowserRouter>
            <RouteSyncer />
            <ThemeBootstrap />
            <AuthProvider>                <AnimatedRoutes />
            </AuthProvider>
            <Toaster />
          </BrowserRouter>
        </ConvexAuthProvider>
      </ThemeProvider>
    </InstrumentationProvider>
  </StrictMode>,
);
