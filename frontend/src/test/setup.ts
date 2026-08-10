import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest runs with globals disabled, so RTL cannot auto-register its own
// afterEach cleanup - do it explicitly to keep the DOM isolated per test.
afterEach(() => {
  cleanup();
});
