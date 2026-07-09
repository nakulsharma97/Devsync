import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Landing from "./pages/Landing.tsx";
import "./index.css";

function App() {
  return (
    <InstrumentationProvider>
      <VlyToolbar />
      <Landing />
    </InstrumentationProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
