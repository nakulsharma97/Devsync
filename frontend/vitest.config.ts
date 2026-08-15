import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Two suites (AdminUsers, Feedback) intermittently time out under parallel
    // load on slow CI runners; retry once before failing so a transient
    // timeout doesn't fail the build. Isolated and full-suite runs pass 92/92.
    retry: 1,
    // jsdom + userEvent + lazy React 19 routes can exceed the 5s default on
    // cold machines; give suites a more comfortable ceiling.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
