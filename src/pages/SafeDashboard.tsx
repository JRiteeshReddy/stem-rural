import Dashboard from "./Dashboard.tsx";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";

export default function SafeDashboard() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-bold text-black" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
              Dashboard temporarily unavailable
            </h1>
            <p className="text-sm text-black/80" style={{ fontFamily: "'Pixelify Sans', monospace" }}>
              An unexpected error occurred while loading the dashboard. Please refresh the page or try again later.
            </p>
            <div className="flex gap-2 justify-center">
              <Button className="rounded-none border-2" onClick={() => window.location.reload()}>
                Refresh
              </Button>
              <Button className="rounded-none border-2" variant="outline" onClick={() => (window.location.href = "/")}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <Dashboard />
    </ErrorBoundary>
  );
}
