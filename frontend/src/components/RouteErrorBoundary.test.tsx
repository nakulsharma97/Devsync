import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RouteErrorBoundary from "./RouteErrorBoundary";

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("component exploded");
  return <p>healthy content</p>;
}

describe("RouteErrorBoundary", () => {
  beforeEach(() => {
    // React logs every caught error; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children untouched while they are healthy", () => {
    render(
      <RouteErrorBoundary>
        <Boom shouldThrow={false} />
      </RouteErrorBoundary>
    );

    expect(screen.getByText("healthy content")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("contains a render error instead of letting it unmount the tree", () => {
    render(
      <RouteErrorBoundary label="This admin page">
        <Boom shouldThrow />
      </RouteErrorBoundary>
    );

    // The fallback is announced to assistive tech and names the failed area,
    // rather than the blank screen React would otherwise leave behind.
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("This admin page couldn't load");
    expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /back to dashboard/i })).toBeDefined();
  });

  it("reports the failure to the console so it is not swallowed silently", () => {
    render(
      <RouteErrorBoundary>
        <Boom shouldThrow />
      </RouteErrorBoundary>
    );

    // React logs its own diagnostic first, so look through every call rather
    // than assuming ours is the first one.
    const calls = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const logged = calls.map((c) => c.map(String).join(" ")).join("\n");
    expect(logged).toContain("Route render failed");
    expect(logged).toContain("component exploded");
  });

  it("recovers when the user retries and the child no longer throws", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RouteErrorBoundary>
        <Boom shouldThrow />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeDefined();

    // Retry clears the boundary's error state, so the re-render picks up the
    // now-healthy child instead of leaving the fallback stuck on screen.
    rerender(
      <RouteErrorBoundary>
        <Boom shouldThrow={false} />
      </RouteErrorBoundary>
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("healthy content")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
