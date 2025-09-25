import { useMemo } from "react";
import * as DashboardModule from "./Dashboard.tsx";

export default function DashboardProxy() {
  // Resolve the component in a safe way: prefer default export, then named "Dashboard"
  const Resolved = useMemo(() => {
    const mod: any = DashboardModule;
    const candidate = mod?.default ?? mod?.Dashboard ?? null;
    return typeof candidate === "function" ? candidate : null;
  }, []);

  if (!Resolved) {
    // Fallback UI to avoid crashing the app if the export is not a valid component
    if (import.meta.env.DEV) {
      // Helpful console for dev
      // eslint-disable-next-line no-console
      console.error(
        "[DashboardProxy] Could not resolve a valid React component from src/pages/Dashboard.tsx. " +
          "Ensure it exports a React component as default or a named export 'Dashboard'.",
        { exports: Object.keys(DashboardModule) }
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm opacity-80">
            We couldn&apos;t load the dashboard component. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return <Resolved />;
}
