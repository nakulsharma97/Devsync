import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import Landing from "./pages/Landing.tsx";
import "./index.css";

function ThemeBootstrap() {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-ready");
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}

function App() {
  const [convexClient] = useState(() => {
    const url = import.meta.env.VITE_CONVEX_URL;
    if (!url) {
      console.warn("VITE_CONVEX_URL is missing — using placeholder");
      return new ConvexReactClient("https://placeholder.convex.cloud");
    }
    return new ConvexReactClient(url);
  });

  return (
    <InstrumentationProvider>
      <VlyToolbar />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ConvexAuthProvider client={convexClient}>
          <ThemeBootstrap />
          <Landing />
        </ConvexAuthProvider>
      </ThemeProvider>
    </InstrumentationProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
