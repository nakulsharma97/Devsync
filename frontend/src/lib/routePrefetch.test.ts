import { describe, it, expect, vi } from "vitest";
import { createPrefetchRegistry } from "./routePrefetch";

/**
 * Prefetching sits on the navigation path, so its contract is "never harmful
 * and never duplicated": an unknown route is a no-op, repeated intent (a nav
 * link fires both mouseenter and focus) triggers exactly one chunk load, and a
 * failed prefetch is swallowed and retried by the next attempt.
 */
describe("createPrefetchRegistry", () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("ignores routes that have no loader", () => {
    const loader = vi.fn(() => Promise.resolve());
    const prefetch = createPrefetchRegistry({ "/feed": loader });

    expect(() => prefetch("/not-a-route")).not.toThrow();
    expect(() => prefetch("")).not.toThrow();
    expect(loader).not.toHaveBeenCalled();
  });

  it("loads a route chunk exactly once for repeated intent", async () => {
    const loader = vi.fn(() => Promise.resolve());
    const prefetch = createPrefetchRegistry({ "/analytics": loader });

    prefetch("/analytics");
    prefetch("/analytics");
    prefetch("/analytics");
    await flush();

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("retries on the next intent after a failed prefetch", async () => {
    const loader = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new Error("chunk download failed"))
      .mockResolvedValue({});
    const prefetch = createPrefetchRegistry({ "/feed": loader });

    prefetch("/feed");
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);

    // The failed attempt must not be remembered as "done".
    prefetch("/feed");
    await flush();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("never rejects, even when the chunk fails to load", async () => {
    const loader = vi.fn(() => Promise.reject(new Error("offline")));
    const prefetch = createPrefetchRegistry({ "/projects": loader });

    await expect(Promise.resolve(prefetch("/projects"))).resolves.toBeUndefined();
  });

  it("gives each route its own load", async () => {
    const analytics = vi.fn(() => Promise.resolve());
    const feed = vi.fn(() => Promise.resolve());
    const prefetch = createPrefetchRegistry({ "/analytics": analytics, "/feed": feed });

    prefetch("/analytics");
    prefetch("/feed");
    prefetch("/analytics");
    await flush();

    expect(analytics).toHaveBeenCalledTimes(1);
    expect(feed).toHaveBeenCalledTimes(1);
  });
});
