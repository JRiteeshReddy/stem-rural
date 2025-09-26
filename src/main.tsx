import { Toaster } from "@/components/ui/sonner";
/* VlyToolbar removed (file not present) */
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import RoleSelection from "./pages/RoleSelection.tsx";
import SafeDashboard from "./pages/SafeDashboard.tsx";
import SafeAuth from "./pages/SafeAuth.tsx";
import Tests from "./pages/Tests.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import Announcements from "./pages/Announcements.tsx";
import Profile from "./pages/Profile.tsx";
import ExtendedSetup from "./pages/ExtendedSetup.tsx";
import Courses from "@/pages/Courses.tsx";
import "./types/global.d.ts";

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* VlyToolbar removed */}
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center">
                Loading...
              </div>
            }
          >
            <Routes>
              <Route path="/tests" element={<Tests />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/extended-setup" element={<ExtendedSetup />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<SafeAuth />} />
              <Route path="/role-selection" element={<RoleSelection />} />
              <Route path="/dashboard" element={<SafeDashboard />} />
              <Route path="/student-portal" element={<SafeDashboard />} />
              <Route path="/teacher-portal" element={<SafeDashboard />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);