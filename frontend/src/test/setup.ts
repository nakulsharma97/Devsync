import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest runs with globals disabled, so RTL cannot auto-register its own
// afterEach cleanup - do it explicitly to keep the DOM isolated per test.
afterEach(() => {
  cleanup();
});

// jsdom does not implement IntersectionObserver. Components like ScrollReveal
// and the animated StatsBar numbers guard on its existence; a no-op stub keeps
// them renderable in tests.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

// sonner and next-themes call window.matchMedia directly.
if (typeof globalThis.matchMedia === "undefined") {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
